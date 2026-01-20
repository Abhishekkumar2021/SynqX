from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

try:
    from google import genai
except Exception:
    genai = None  # Handle missing dependency gracefully

from app import models
from app.api import deps
from app.core.config import settings

router = APIRouter()


class AIConvertRequest(BaseModel):
    prompt: str
    context: str = "OSDU Lucene Search"
    metadata: list[dict[str, Any]] | None = None


class AIConvertResponse(BaseModel):
    result: str
    explanation: str


@router.post("/convert", response_model=AIConvertResponse)
async def convert_prompt(
    request: AIConvertRequest,
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
):
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="AI Configuration Missing: GOOGLE_API_KEY is not set.",
        )

    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="AI Dependency Missing: 'google-genai' library is not installed.",
        )

    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)

        # Dynamic System Prompt Selection
        is_sql = "sql" in request.context.lower() or "oracle" in request.context.lower() or "prosource" in request.context.lower()

        # Format metadata for AI if provided
        meta_context = ""
        if request.metadata:
            meta_context = "\nTECHNICAL SCHEMA CONTEXT (Use these exact column names):\n"
            for col in request.metadata:
                meta_context += f"- {col.get('name')} ({col.get('type')})\n"

        if is_sql:
            system_prompt = f"""
            You are the Synqx Data Mesh Orchestrator, an elite expert in Oracle SQL and SLB ProSource (Seabed) schema.
            Your mission is to transform ambiguous natural language instructions into high-performance, valid Oracle SQL select statements or WHERE clauses.

            STRATEGIC CONTEXT: {request.context}
            {meta_context}

            OPERATIONAL RULES:
            1. SYNTAX PRECISION: Use standard Oracle SQL. For string matching, prefer 'LIKE' with '%' wildcards.
            2. COLUMN MAPPING: Prefer technical columns provided in the SCHEMA CONTEXT above. If not provided, use standard Seabed names.
            3. QUOTING: Use single quotes for string literals. Do NOT use double quotes for identifiers unless strictly necessary.
            4. SCOPE: Focus on generating the WHERE clause or a complete SELECT * FROM [TABLE] WHERE ... statement.
            5. OUTPUT FORMAT: You must return a strictly formatted response:
               QUERY: <single_line_sql_query>
               EXPLANATION: <one_sentence_expert_explanation_of_the_logic>

            USER INSTRUCTION:
            """
        else:
            system_prompt = f"""
            You are the Synqx Data Mesh Orchestrator, an elite expert in OSDU (Open Subsurface Data Universe) and Lucene query syntax.
            Your mission is to transform ambiguous natural language instructions into high-performance, valid Lucene Search queries for the OSDU Search API.

            STRATEGIC CONTEXT: {request.context}

            OPERATIONAL RULES:
            1. SCHEMA PRECISION: Use 'kind' for entity types. Master data should look like 'kind: "*:*:master-data--Well:*"' unless a specific version is implied.
            2. ATTRIBUTE MAPPING: All domain data fields MUST be prefixed with 'data.' (e.g., 'data.Status', 'data.WellName').
            3. WILDCARDS: Use '*' generously for prefix/suffix matching if the user is being broad.
            4. OPERATORS: Support AND, OR, NOT, and range queries (e.g., data.Depth:[1000 TO 5000]).
            5. OUTPUT FORMAT: You must return a strictly formatted response:
               QUERY: <single_line_lucene_query>
               EXPLANATION: <one_sentence_expert_explanation_of_the_logic>

            USER INSTRUCTION:
            """

        # Try primary model
        model_name = settings.GOOGLE_AI_MODEL
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=f"{system_prompt}\n\n{request.prompt}",
                config={
                    "temperature": 0.0,  # Strategy: Maximum precision for syntax
                    "max_output_tokens": settings.GOOGLE_AI_MAX_OUTPUT_TOKENS,
                },
            )
        except Exception as e:
            if "404" in str(e):
                # Fallback to standard lite if specific version not found
                response = client.models.generate_content(
                    model="gemini-2.0-flash-lite",
                    contents=f"{system_prompt}\n\n{request.prompt}",
                    config={
                        "temperature": 0.0,
                        "max_output_tokens": settings.GOOGLE_AI_MAX_OUTPUT_TOKENS,
                    },
                )
            else:
                raise e

        if not response or not response.text:
            raise HTTPException(
                status_code=500, detail="AI Service returned an empty response."
            )

        text = response.text
        query = "*"
        explanation = "Parsed by Gemini"

        for line in text.split("\n"):
            if line.startswith("QUERY:"):
                query = line.replace("QUERY:", "").strip().strip("`").strip('"')
            if line.startswith("EXPLANATION:"):
                explanation = line.replace("EXPLANATION:", "").strip()

        return AIConvertResponse(result=query, explanation=explanation)

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:
            # Re-raise with a clean message for the UI
            raise HTTPException(  # noqa: B904
                status_code=429,
                detail="AI Quota Exceeded. The Gemini API is currently limiting requests for this key.",  # noqa: E501
            )
        if "404" in error_msg:
            raise HTTPException(  # noqa: B904
                status_code=404,
                detail=f"Model '{settings.GOOGLE_AI_MODEL}' not found. Please check your .env configuration.",  # noqa: E501
            )
        raise HTTPException(status_code=500, detail=f"AI Service Error: {error_msg}")  # noqa: B904
