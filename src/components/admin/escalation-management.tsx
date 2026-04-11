'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2, AlertTriangle, Check, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ClientEditProfileButton } from '@/components/common/client-edit-profile-button';
import type { EscalationRule, EscalationTemplate, EscalationLog, EscalationEventType, EscalationPriority } from '@/types';

const EVENT_TYPES: { value: EscalationEventType; label: string }[] = [
  { value: 'pass_overdue', label: 'Pass Overdue' },
  { value: 'rapid_requests', label: 'Rapid Requests' },
  { value: 'suspicious_pattern', label: 'Suspicious Pattern' },
  { value: 'late_returns', label: 'Repeated Late Returns' },
];

const PRIORITIES: { value: EscalationPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

interface RuleFormData {
  name: string;
  description: string;
  event_type: EscalationEventType;
  threshold_minutes: number;
  priority: EscalationPriority;
  notify_student: boolean;
  notify_parents: boolean;
  notify_wardens: boolean;
  notify_admins: boolean;
  auto_action: string;
}

export function EscalationManagement() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [templates, setTemplates] = useState<EscalationTemplate[]>([]);
  const [logs, setLogs] = useState<EscalationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    event_type: 'pass_overdue',
    threshold_minutes: 30,
    priority: 'medium',
    notify_student: true,
    notify_parents: true,
    notify_wardens: true,
    notify_admins: false,
    auto_action: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, templatesRes, logsRes] = await Promise.all([
        fetch('/api/admin/escalation/rules'),
        fetch('/api/admin/escalation/templates'),
        fetch('/api/admin/escalation/logs?limit=50'),
      ]);

      if (rulesRes.ok) {
        const { rules } = await rulesRes.json();
        setRules(rules);
      }

      if (templatesRes.ok) {
        const { templates } = await templatesRes.json();
        setTemplates(templates);
      }

      if (logsRes.ok) {
        const { logs } = await logsRes.json();
        setLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching escalation data:', error);
      toast.error('Failed to load escalation data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingRule
        ? `/api/admin/escalation/rules/${editingRule.id}`
        : '/api/admin/escalation/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save rule');
      }

      toast.success(editingRule ? 'Rule updated' : 'Rule created');
      setDialogOpen(false);
      setEditingRule(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/admin/escalation/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleUpdateLog = async (logId: string, action: 'acknowledge' | 'resolve', notes?: string) => {
    try {
      const response = await fetch('/api/admin/escalation/logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, action, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update log');
      }

      toast.success(action === 'acknowledge' ? 'Escalation acknowledged' : 'Escalation resolved');
      fetchData();
    } catch (error) {
      toast.error('Failed to update escalation');
    }
  };

  const applyTemplate = (template: EscalationTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      event_type: template.event_type,
      threshold_minutes: template.default_threshold_minutes,
      priority: template.default_priority,
      notify_student: template.notify_student,
      notify_parents: template.notify_parents,
      notify_wardens: template.notify_wardens,
      notify_admins: template.notify_admins,
      auto_action: '',
    });
  };

  const openEditDialog = (rule: EscalationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      event_type: rule.event_type,
      threshold_minutes: rule.threshold_minutes,
      priority: rule.priority,
      notify_student: rule.notify_student,
      notify_parents: rule.notify_parents,
      notify_wardens: rule.notify_wardens,
      notify_admins: rule.notify_admins,
      auto_action: rule.auto_action || '',
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      event_type: 'pass_overdue',
      threshold_minutes: 30,
      priority: 'medium',
      notify_student: true,
      notify_parents: true,
      notify_wardens: true,
      notify_admins: false,
      auto_action: '',
    });
    setDialogOpen(true);
  };

  const getPriorityColor = (priority: EscalationPriority) => {
    return PRIORITIES.find(p => p.value === priority)?.color || 'bg-gray-100';
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-xl" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-card border border-border rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="rules" className="space-y-8">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="rules" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Escalation Rules</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Templates</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Active Escalations ({logs.filter(l => l.status !== 'resolved').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">Escalation Rules</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure when and how escalations are triggered
              </p>
            </div>
            <Button 
              onClick={openCreateDialog}
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-500/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="grid gap-4">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No escalation rules configured</p>
                  <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                    Create your first rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {rule.name}
                          <Badge className={getPriorityColor(rule.priority)}>
                            {rule.priority}
                          </Badge>
                          {!rule.is_active && (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{rule.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Event:</span>
                        <span className="font-medium ml-2">
                          {EVENT_TYPES.find(e => e.value === rule.event_type)?.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Threshold:</span>
                        <span className="font-medium ml-2">
                          {rule.threshold_minutes > 0 ? `${rule.threshold_minutes} min` : 'Immediate'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rule.notify_student && <Badge variant="outline">Student</Badge>}
                      {rule.notify_parents && <Badge variant="outline">Parents</Badge>}
                      {rule.notify_wardens && <Badge variant="outline">Wardens</Badge>}
                      {rule.notify_admins && <Badge variant="outline">Admins</Badge>}
                      {rule.auto_action && (
                        <Badge variant="secondary">Auto: {rule.auto_action}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Escalation Templates</h3>
            <p className="text-sm text-muted-foreground">
              Pre-configured escalation patterns you can use as a starting point
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.is_system && (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge className={getPriorityColor(template.default_priority)}>
                      {template.default_priority}
                    </Badge>
                    <Badge variant="outline">
                      {template.default_threshold_minutes > 0 
                        ? `${template.default_threshold_minutes} min`
                        : 'Immediate'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.notify_student && <Badge variant="outline">Student</Badge>}
                    {template.notify_parents && <Badge variant="outline">Parents</Badge>}
                    {template.notify_wardens && <Badge variant="outline">Wardens</Badge>}
                    {template.notify_admins && <Badge variant="outline">Admins</Badge>}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      applyTemplate(template);
                      setDialogOpen(true);
                    }}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Active Escalations</h3>
            <p className="text-sm text-muted-foreground">
              Escalation events that need attention
            </p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No active escalations
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {(log.student as unknown as { full_name: string })?.full_name || 'Unknown'}
                        {log.student && (
                          <ClientEditProfileButton user={log.student as any} variant="icon" />
                        )}
                      </TableCell>
                      <TableCell>
                        {EVENT_TYPES.find(e => e.value === log.trigger_event)?.label || log.trigger_event}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(log.priority)}>{log.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'active' ? 'destructive' : 'secondary'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {log.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateLog(log.id, 'acknowledge')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Ack
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateLog(log.id, 'resolve')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure when and how escalations should be triggered
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Pass Overdue - Warning"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value as EscalationEventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when this rule should trigger..."
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="threshold_minutes">Threshold (minutes)</Label>
                <Input
                  id="threshold_minutes"
                  type="number"
                  min="0"
                  value={formData.threshold_minutes}
                  onChange={(e) => setFormData({ ...formData, threshold_minutes: parseInt(e.target.value) || 0 })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  0 = immediate trigger
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as EscalationPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notify Recipients</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify_student" className="cursor-pointer">Student</Label>
                  <Switch
                    id="notify_student"
                    checked={formData.notify_student}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_student: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify_parents" className="cursor-pointer">Parents</Label>
                  <Switch
                    id="notify_parents"
                    checked={formData.notify_parents}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_parents: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify_wardens" className="cursor-pointer">Wardens</Label>
                  <Switch
                    id="notify_wardens"
                    checked={formData.notify_wardens}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_wardens: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify_admins" className="cursor-pointer">Admins</Label>
                  <Switch
                    id="notify_admins"
                    checked={formData.notify_admins}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_admins: checked })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-500/20 px-8"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
