import { motion } from "motion/react";

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const hours = ['9AM', '12PM', '3PM', '6PM'];

// Mock data: 5 days x 4 time blocks
const productivityData = [
  [40, 70, 90, 30],
  [20, 50, 80, 40],
  [60, 90, 70, 50],
  [30, 60, 40, 20],
  [80, 40, 60, 90],
];

export function TeamHeatmap() {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg">Productivity Heatmap</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/5" />
            <span className="text-[10px] text-white/30 font-medium">Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-violet-600" />
            <span className="text-[10px] text-white/30 font-medium">Peak</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[32px_1fr] gap-4">
        <div className="flex flex-col justify-between py-2 text-[10px] text-white/20 font-bold uppercase tracking-tighter">
          {hours.reverse().map(h => <span key={h}>{h}</span>)}
        </div>
        
        <div className="grid grid-cols-5 gap-3">
          {productivityData.map((dayData, dayIdx) => (
            <div key={dayIdx} className="space-y-3">
              {dayData.reverse().map((val, hourIdx) => (
                <motion.div
                  key={hourIdx}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: (dayIdx * 0.1) + (hourIdx * 0.05) }}
                  className="aspect-square rounded-lg relative group cursor-help"
                  style={{ 
                    backgroundColor: `rgba(139, 92, 246, ${val / 100})`,
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 rounded-lg flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{val}%</span>
                  </div>
                </motion.div>
              ))}
              <span className="block text-center text-[10px] text-white/20 font-bold uppercase tracking-widest pt-2">
                {days[dayIdx]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
