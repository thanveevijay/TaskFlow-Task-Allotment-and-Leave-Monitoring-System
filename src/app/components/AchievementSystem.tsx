import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Award, Trophy, Star, Target, Zap, Users, Calendar, TrendingUp } from "lucide-react";
import { getTasks } from "../api/tasks";
import { getKudos } from "../api/kudos";
import { getStoredUserProfile } from "../lib/userProfile";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'tasks' | 'kudos' | 'attendance' | 'performance';
  requirement: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
  points: number;
}

export function AchievementSystem() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const currentUser = getStoredUserProfile();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const tasks = await getTasks(currentUser?.id);
      const kudos = await getKudos();
      const processedAchievements = generateAchievements(tasks, kudos);
      setAchievements(processedAchievements);
      
      const points = processedAchievements
        .filter(a => a.unlocked)
        .reduce((sum, a) => sum + a.points, 0);
      setTotalPoints(points);
    } catch (error) {
      console.error("Failed to load achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAchievements = (tasks: any[], kudos: any[]): Achievement[] => {
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const totalTasks = tasks.length;
    const receivedKudos = kudos.filter(k => k.receiverId === currentUser?.id).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const baseAchievements: Achievement[] = [
      // Task Achievements
      {
        id: 'first_task',
        name: 'Task Master',
        description: 'Complete your first task',
        icon: 'Target',
        category: 'tasks',
        requirement: 1,
        current: completedTasks,
        unlocked: completedTasks >= 1,
        points: 10,
      },
      {
        id: 'task_warrior',
        name: 'Task Warrior',
        description: 'Complete 25 tasks',
        icon: 'Star',
        category: 'tasks',
        requirement: 25,
        current: completedTasks,
        unlocked: completedTasks >= 25,
        points: 50,
      },
      {
        id: 'task_legend',
        name: 'Task Legend',
        description: 'Complete 100 tasks',
        icon: 'Trophy',
        category: 'tasks',
        requirement: 100,
        current: completedTasks,
        unlocked: completedTasks >= 100,
        points: 200,
      },
      
      // Kudos Achievements
      {
        id: 'team_player',
        name: 'Team Player',
        description: 'Receive 10 kudos from colleagues',
        icon: 'Users',
        category: 'kudos',
        requirement: 10,
        current: receivedKudos,
        unlocked: receivedKudos >= 10,
        points: 30,
      },
      {
        id: 'kudos_star',
        name: 'Kudos Star',
        description: 'Receive 25 kudos from colleagues',
        icon: 'Star',
        category: 'kudos',
        requirement: 25,
        current: receivedKudos,
        unlocked: receivedKudos >= 25,
        points: 75,
      },
      
      // Performance Achievements
      {
        id: 'high_performer',
        name: 'High Performer',
        description: 'Maintain 90% task completion rate',
        icon: 'TrendingUp',
        category: 'performance',
        requirement: 90,
        current: Math.round(completionRate),
        unlocked: completionRate >= 90,
        points: 40,
      },
      {
        id: 'perfect_week',
        name: 'Perfect Week',
        description: 'Complete all assigned tasks in a week',
        icon: 'Calendar',
        category: 'performance',
        requirement: 100,
        current: Math.round(completionRate),
        unlocked: completionRate >= 100,
        points: 60,
      },
      
      // Special Achievements
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Complete tasks before deadline',
        icon: 'Zap',
        category: 'performance',
        requirement: 80,
        current: 75, // Simulated value
        unlocked: false,
        points: 35,
      },
      {
        id: 'consistency_king',
        name: 'Consistency King',
        description: 'Complete tasks for 30 consecutive days',
        icon: 'Award',
        category: 'performance',
        requirement: 30,
        current: 15, // Simulated value
        unlocked: false,
        points: 100,
      },
    ];

    // Add unlocked dates for demo purposes
    return baseAchievements.map(achievement => {
      if (achievement.unlocked) {
        return {
          ...achievement,
          unlockedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return achievement;
    });
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Target': return <Target className="w-6 h-6" />;
      case 'Star': return <Star className="w-6 h-6" />;
      case 'Trophy': return <Trophy className="w-6 h-6" />;
      case 'Users': return <Users className="w-6 h-6" />;
      case 'TrendingUp': return <TrendingUp className="w-6 h-6" />;
      case 'Calendar': return <Calendar className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Award': return <Award className="w-6 h-6" />;
      default: return <Award className="w-6 h-6" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tasks': return 'bg-blue-100 text-blue-800';
      case 'kudos': return 'bg-purple-100 text-purple-800';
      case 'performance': return 'bg-green-100 text-green-800';
      case 'attendance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercentage = (unlockedCount / totalCount) * 100;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievement System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-primary">{totalPoints}</div>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-600">{unlockedCount}</div>
              <p className="text-sm text-muted-foreground">Unlocked</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{totalCount - unlockedCount}</div>
              <p className="text-sm text-muted-foreground">Locked</p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{unlockedCount}/{totalCount}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progressPercentage.toFixed(1)}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <Card 
            key={achievement.id} 
            className={`transition-all hover:shadow-md ${
              achievement.unlocked 
                ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-200' 
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-full ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-br from-amber-200 to-yellow-300 text-amber-800' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {getIconComponent(achievement.icon)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-sm ${
                      achievement.unlocked ? 'text-amber-900' : 'text-gray-600'
                    }`}>
                      {achievement.name}
                    </h3>
                    {achievement.unlocked && (
                      <Badge variant="secondary" className="text-xs">
                        +{achievement.points} pts
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getCategoryColor(achievement.category)}>
                      {achievement.category}
                    </Badge>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {!achievement.unlocked && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium">
                          {achievement.current}/{achievement.requirement}
                        </span>
                      </div>
                      <Progress 
                        value={(achievement.current / achievement.requirement) * 100} 
                        className="h-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Achievement Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Rajesh Kumar', points: 450, rank: 1 },
              { name: 'Priya Sharma', points: 380, rank: 2 },
              { name: currentUser?.name || 'You', points: totalPoints, rank: 3, isCurrentUser: true },
              { name: 'Amit Patel', points: 320, rank: 4 },
              { name: 'Neha Gupta', points: 290, rank: 5 },
            ].map((user) => (
              <div 
                key={user.rank} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  user.isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    user.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    user.rank === 2 ? 'bg-gray-400 text-gray-900' :
                    user.rank === 3 ? 'bg-amber-600 text-amber-900' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {user.rank}
                  </div>
                  <span className={`font-medium ${user.isCurrentUser ? 'text-blue-900' : ''}`}>
                    {user.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{user.points}</span>
                  <span className="text-sm text-muted-foreground">pts</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
