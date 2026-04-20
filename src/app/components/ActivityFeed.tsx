import { motion } from "motion/react";
import { Activity, CheckCircle2, MessageSquare, UserPlus } from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'task' | 'comment' | 'system' | 'user';
  user: string;
  content: string;
  time: string;
}

const mockActivities: ActivityItem[] = [
  { id: '1', type: 'task', user: 'Arjun Mehta', content: 'completed "API Integration"', time: '2m ago' },
  { id: '2', type: 'comment', user: 'Priya Nair', content: 'left a note on "UX Design"', time: '15m ago' },
  { id: '3', type: 'user', user: 'System', content: 'added Mohit Arora to HR Team', time: '1h ago' },
  { id: '4', type: 'task', user: 'Kavya Iyer', content: 'moved "QA Testing" to Done', time: '3h ago' },
];

export function ActivityFeed() {
  return (
    <div className="glass-card rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-violet-400" />
        <h3 className="text-white font-bold text-lg">Live Activity</h3>
      </div>
      
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-2">
        {mockActivities.map((activity, idx) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex gap-4 relative"
          >
            {idx !== mockActivities.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-white/5" />
            )}
            
            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center relative z-10
              ${activity.type === 'task' ? 'bg-emerald-500/20 text-emerald-400' : 
                activity.type === 'comment' ? 'bg-sky-500/20 text-sky-400' : 
                'bg-violet-500/20 text-violet-400'}`}
            >
              {activity.type === 'task' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
               activity.type === 'comment' ? <MessageSquare className="w-3.5 h-3.5" /> : 
               <UserPlus className="w-3.5 h-3.5" />}
            </div>
            
            <div className="min-w-0">
              <p className="text-xs text-white/50">
                <span className="text-white font-semibold">{activity.user}</span> {activity.content}
              </p>
              <span className="text-[10px] text-white/20 mt-1 block font-medium">{activity.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      <button className="mt-6 text-xs font-bold text-violet-400/80 hover:text-violet-400 transition-colors uppercase tracking-widest text-center">
        View All History
      </button>
    </div>
  );
}
