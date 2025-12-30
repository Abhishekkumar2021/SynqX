/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { codeToHtml } from 'shiki';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

interface CodeBlockProps {
  code: string;
  language?: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  maxHeight?: string;
  rounded?: boolean;
  wrap?: boolean;
  usePortal?: boolean;
}

export const CodeBlock = ({
  code,
  language = 'typescript',
  editable = false,
  onChange,
  className,
  placeholder,
  title,
  maxHeight = '400px',
  rounded = false,
  wrap = false,
  usePortal = false
}: CodeBlockProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  const isDark = useMemo(() =>
    theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    [theme]
  );

  const shikiTheme = useMemo(() => isDark ? 'vitesse-dark' : 'vitesse-light', [isDark]);

  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMaximized]);

  useEffect(() => {
    let mounted = true;
    async function highlight() {
      if (!code || editable) return;
      try {
        const html = await codeToHtml(code, { lang: language, theme: shikiTheme });
        if (mounted) setHighlightedCode(html);
      } catch (e) {
        if (mounted) setHighlightedCode(`<pre><code>${code}</code></pre>`);
      }
    }
    highlight();
    return () => { mounted = false; };
  }, [code, language, editable, shikiTheme]);

  const handleCopy = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const renderContent = (isExpanded: boolean) => (
    <div className="relative w-full h-full group/content flex flex-col min-h-0">
      <div className="absolute inset-0 bg-noise opacity-[0.03] dark:opacity-[0.02] pointer-events-none" />

      {editable ? (
        <Textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "font-mono bg-transparent border-0 focus-visible:ring-0 resize-none w-full relative z-10",
            "overflow-y-auto custom-scrollbar flex-1",
            wrap ? "whitespace-pre-wrap" : "whitespace-pre",
            isExpanded ? "text-sm leading-relaxed p-8" : "text-xs leading-relaxed p-5"
          )}
          spellCheck={false}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full overflow-y-auto relative z-20 select-text cursor-text custom-scrollbar flex-1",
            "dark:[&_.shiki_span]:filter dark:[&_.shiki_span]:brightness-125",
            wrap ? "[&>pre]:whitespace-pre-wrap" : "[&>pre]:whitespace-pre",
            isExpanded ? "text-[13px]" : "text-[11px]",
            "[&>pre]:bg-transparent! [&>pre]:m-0 [&>pre]:w-full [&>pre]:h-full",
            isExpanded ? "[&>pre]:p-8 [&>pre]:leading-7" : "[&>pre]:p-5 [&>pre]:leading-6"
          )}
          onPointerDown={(e) => e.stopPropagation()}
          dangerouslySetInnerHTML={{
            __html: highlightedCode || `<pre class="p-4 opacity-40">${code}</pre>`
          }}
        />
      )}
    </div>
  );

  const maximizedContent = (
    <AnimatePresence>
      {isMaximized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/40 backdrop-blur-2xl"
            onClick={() => setIsMaximized(false)}
          />

          <motion.div
            layoutId={`code-block-${title}`}
            className="relative w-full h-full bg-background flex flex-col z-[10001]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Simplified Minimal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-muted/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/50 font-mono text-muted-foreground">
                    {language}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-2 text-xs hover:bg-primary/5 hover:text-primary transition-all"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMaximized(false)}
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors group"
                >
                  <X size={18} className="transition-transform group-hover:rotate-90" />
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-transparent">
              {renderContent(true)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn("relative", isMaximized && "z-[9999]")}>
      <div
        className={cn(
          "relative group transition-all duration-500 w-full flex flex-col overflow-hidden",
          "bg-transparent border border-border/20 shadow-none",
          rounded ? "rounded-xl" : "rounded-sm",
          className
        )}
        style={{ height: maxHeight }} // Fixed height enables internal scroll
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Floating Actions (Top Right) */}
        {!isMaximized && (
          <div className={cn(
            "absolute top-2 right-2 z-30 flex gap-1 transition-all duration-300",
            isHovering ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-background/80 backdrop-blur-md border border-border/40 shadow-sm">
              <Button size="icon" variant="ghost" onClick={handleCopy} title="Copy Code" className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary">
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsMaximized(true)} title="Maximize" className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary">
                <Maximize2 size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* This container allows the internal scroll to happen */}
        <div className="flex-1 min-h-0 bg-background/50">
          {renderContent(false)}
        </div>
      </div>

      {usePortal ? createPortal(maximizedContent, document.body) : maximizedContent}
    </div>
  );
};