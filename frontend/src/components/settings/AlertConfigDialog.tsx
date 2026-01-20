/* eslint-disable react-hooks/incompatible-library */
import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertType, AlertDeliveryMethod, AlertLevel } from '@/lib/enums'
import { createAlertConfig } from '@/lib/api'
import { toast } from 'sonner'
import { PlusCircle, Info } from 'lucide-react'

interface AlertConfigForm {
  name: string
  alert_type: string
  delivery_method: string
  recipient: string
  level: string
  cooldown_minutes: number
}

export const AlertConfigDialog: React.FC = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const { register, handleSubmit, control, reset, watch } = useForm<AlertConfigForm>({
    defaultValues: {
      alert_type: AlertType.JOB_FAILURE,
      delivery_method: AlertDeliveryMethod.IN_APP,
      level: AlertLevel.ERROR,
      cooldown_minutes: 30,
    },
  })

  const deliveryMethod = watch('delivery_method')

  const mutation = useMutation({
    mutationFn: createAlertConfig,
    onSuccess: () => {
      toast.success('Alert configuration created')
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      setOpen(false)
      reset()
    },
    onError: (error: any) => {
       
      toast.error('Failed to create alert', {
        description: error.response?.data?.detail || 'Unknown error',
      })
    },
  })

  const onSubmit = (data: AlertConfigForm) => {
    mutation.mutate(data)
  }

  const getRecipientLabel = () => {
    switch (deliveryMethod) {
      case AlertDeliveryMethod.SLACK:
        return 'Slack Webhook URL'
      case AlertDeliveryMethod.TEAMS:
        return 'Microsoft Teams Webhook URL'
      case AlertDeliveryMethod.EMAIL:
        return 'Email Address'
      case AlertDeliveryMethod.PAGERDUTY:
        return 'PagerDuty Integration Key'
      case AlertDeliveryMethod.WEBHOOK:
        return 'Webhook URL'
      default:
        return 'Recipient'
    }
  }

  const getRecipientPlaceholder = () => {
    switch (deliveryMethod) {
      case AlertDeliveryMethod.SLACK:
        return 'https://hooks.slack.com/services/...'
      case AlertDeliveryMethod.TEAMS:
        return 'https://outlook.office.com/webhook/...'
      case AlertDeliveryMethod.EMAIL:
        return 'user@example.com'
      case AlertDeliveryMethod.PAGERDUTY:
        return '32-character integration key'
      default:
        return 'Enter target address/URL'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PlusCircle className="h-4 w-4" /> Add Alert Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>New Alert Rule</DialogTitle>
          <DialogDescription>
            Define how and when you want to be notified about pipeline events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              {...register('name', { required: true })}
              placeholder="e.g. Production Failure Slack"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Controller
                control={control}
                name="alert_type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AlertType.JOB_FAILURE}>Job Failed</SelectItem>
                      <SelectItem value={AlertType.JOB_SUCCESS}>Job Succeeded</SelectItem>
                      <SelectItem value={AlertType.JOB_STARTED}>Job Started</SelectItem>
                      <SelectItem value={AlertType.DATA_QUALITY_FAILURE}>
                        Data Quality Issue
                      </SelectItem>
                      <SelectItem value={AlertType.SCHEMA_CHANGE_DETECTED}>
                        Schema Change
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Controller
                control={control}
                name="level"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AlertLevel.INFO}>Info</SelectItem>
                      <SelectItem value={AlertLevel.WARNING}>Warning</SelectItem>
                      <SelectItem value={AlertLevel.ERROR}>Error</SelectItem>
                      <SelectItem value={AlertLevel.CRITICAL}>Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Method</Label>
            <Controller
              control={control}
              name="delivery_method"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AlertDeliveryMethod.IN_APP}>In-App Only</SelectItem>
                    <SelectItem value={AlertDeliveryMethod.SLACK}>Slack Webhook</SelectItem>
                    <SelectItem value={AlertDeliveryMethod.TEAMS}>Microsoft Teams</SelectItem>
                    <SelectItem value={AlertDeliveryMethod.EMAIL}>Email</SelectItem>
                    <SelectItem value={AlertDeliveryMethod.PAGERDUTY}>PagerDuty</SelectItem>
                    <SelectItem value={AlertDeliveryMethod.WEBHOOK}>Custom Webhook</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {deliveryMethod !== AlertDeliveryMethod.IN_APP && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="recipient">{getRecipientLabel()}</Label>
              <Input
                id="recipient"
                {...register('recipient', {
                  required: deliveryMethod !== AlertDeliveryMethod.IN_APP,
                })}
                placeholder={getRecipientPlaceholder()}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cooldown">Cooldown (minutes)</Label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Prevents alert fatigue
              </span>
            </div>
            <Input
              id="cooldown"
              type="number"
              {...register('cooldown_minutes', { valueAsNumber: true })}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
