import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Activity, CheckCircle2, MessageSquare, UserPlus, Heart } from "lucide-react";
import { getNotifications, type ActivityNotification } from "../api/notifications";
import { getRecentKudos, type KudosRecord } from "../api/kudos";

interface ActivityItem {
  id: string;
  type: 'task' | 'comment' | 'system' | 'user' | 'kudos';
  user: string;
  content: string;
  date: Date;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    Promise.all([
      getNotifications(10).catch(() => [] as ActivityNotification[]),
      getRecentKudos().catch(() => [] as KudosRecord[])
    ]).then(([notifs, kudos]) => {
      const formattedNotifs = notifs.map(n => ({
        id: `notif-${n.id}`,
        type: n.entityType === 'task' ? 'task' : n.entityType === 'comment' ? 'comment' : 'system' as any,
        user: n.actorName || 'System',
        content: `${n.action} ${n.meta || ''}`,
        date: new Date(n.createdAt || Date.now())
      }));

      const formattedKudos = kudos.map(k => ({
        id: `kudos-${k.id}`,
        type: 'kudos' as any,
        user: k.senderName,
        content: `gave kudos to ${k.receiverName} for ${k.category}`,
        date: new Date(k.createdAt || Date.now())
      }));

      const combined = [...formattedNotifs, ...formattedKudos]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 15);
      
      setActivities(combined);
    });
  }, []);

  const formatTime = (d: Date) => {
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  return (
    <div className="glass-card rounded-2xl p-6 h-[460px] flex flex-col">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Activity className="w-5 h-5 text-violet-400" />
        <h3 className="text-white font-bold text-lg">Live Activity</h3>
      </div>
      
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-2">
        {activities.length === 0 ? (
          <div className="text-white/20 text-xs text-center py-8">No recent activity</div>
        ) : activities.map((activity, idx) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-4 relative"
          >
            {idx !== activities.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-white/5" />
            )}
            
            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center relative z-10
              ${activity.type === 'task' ? 'bg-emerald-500/20 text-emerald-400' : 
                activity.type === 'comment' ? 'bg-sky-500/20 text-sky-400' : 
                activity.type === 'kudos' ? 'bg-pink-500/20 text-pink-400' :
                'bg-violet-500/20 text-violet-400'}`}
            >
              {activity.type === 'task' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
               activity.type === 'comment' ? <MessageSquare className="w-3.5 h-3.5" /> : 
               activity.type === 'kudos' ? <Heart className="w-3.5 h-3.5 fill-current" /> :
               <UserPlus className="w-3.5 h-3.5" />}
            </div>
            
            <div className="min-w-0">
              <p className="text-xs text-white/50 leading-relaxed">
                <span className="text-white font-semibold">{activity.user}</span> {activity.content}
              </p>
              <span className="text-[10px] text-white/20 mt-0.5 block font-medium">{formatTime(activity.date)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
