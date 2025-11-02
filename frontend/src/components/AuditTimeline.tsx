import { formatDate, formatRelativeTime } from '../lib/utils';
import { Clock } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
}

interface AuditTimelineProps {
  logs: AuditLog[];
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  // Parse audit log details into readable format matching spec
  // Format: "Nov 18 2:20 PM — Library — Status: Hold — Reason: Book fee outstanding"
  const parseAuditDetails = (action: string, details: string | null, timestamp: string) => {
    if (!details) {
      // Format timestamp: "Nov 18 2:20 PM"
      const date = new Date(timestamp);
      const formattedTime = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${formattedTime} — ${action}`;
    }
    
    try {
      const parsed = JSON.parse(details);
      
      // Format timestamp: "Nov 18 2:20 PM"
      const date = new Date(timestamp);
      const formattedTime = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      
      let message = formattedTime;
      
      // Format department status changes per spec
      if (parsed.libraryStatus) {
        message += ` — Library — Status: ${parsed.libraryStatus}`;
        if (parsed.libraryNote) message += ` — Reason: ${parsed.libraryNote}`;
      } else if (parsed.bursarStatus) {
        message += ` — Bursar — Status: ${parsed.bursarStatus}`;
        if (parsed.bursarNote) message += ` — Reason: ${parsed.bursarNote}`;
      } else if (parsed.academicStatus) {
        message += ` — Academic — Status: ${parsed.academicStatus}`;
        if (parsed.academicNote) message += ` — Reason: ${parsed.academicNote}`;
      } else if (parsed.status) {
        message += ` — Status: ${parsed.status}`;
        if (parsed.verifierNotes) message += ` — ${parsed.verifierNotes}`;
      } else if (parsed.verifierNotes) {
        message += ` — ${parsed.verifierNotes}`;
      } else {
        message += ` — ${action}`;
      }
      
      return message;
    } catch {
      const date = new Date(timestamp);
      const formattedTime = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${formattedTime} — ${action} — ${details}`;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Activity Timeline</h3>
      <div className="space-y-3">
        {logs.map((log) => {
          const date = new Date(log.timestamp);
          const formattedDate = formatDate(log.timestamp);
          const relativeTime = formatRelativeTime(log.timestamp);
          const actor = log.user?.name || log.user?.email || 'System';
          const message = parseAuditDetails(log.action, log.details, log.timestamp);

          return (
            <div key={log.id} className="flex gap-4 pb-4 border-b last:border-0">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{actor}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground" title={formattedDate}>
                        {relativeTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

