import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getEmployees } from '../api/employees';
import type { Employee } from '../api/types';
import { Network, User } from 'lucide-react';
import { EmployeeAvatar } from '../components/EmployeeAvatar';

export default function OrgChart() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Organizational Chart...</div>;
  }

  // Group by department
  const byDept: Record<string, typeof employees> = {};
  for (const emp of employees) {
    const d = emp.department || 'General';
    if (!byDept[d]) byDept[d] = [];
    byDept[d].push(emp);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-xl">
          <Network className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl text-foreground mb-1">Organizational Chart</h1>
          <p className="text-muted-foreground">Company hierarchy and department structure</p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-12 pb-12">
        {/* CEO / Top Level Node */}
        <div className="flex flex-col items-center">
          <Card className="w-64 border-primary/20 shadow-md">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                <Network className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg">Acme Corp</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Headquarters</p>
            </CardContent>
          </Card>
          <div className="w-0.5 h-8 bg-border"></div>
          <div className="w-full max-w-5xl h-0.5 bg-border rounded-full relative"></div>
        </div>

        {/* Departments */}
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-7xl">
          {Object.entries(byDept).map(([deptName, emps]) => {
            const managers = emps.filter(e => e.accessRole === 'manager' || e.role.toLowerCase().includes('manager'));
            const staff = emps.filter(e => e.accessRole !== 'manager' && !e.role.toLowerCase().includes('manager'));

            return (
              <div key={deptName} className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-border"></div>
                <Card className="w-72 border-r-4 border-r-primary">
                  <CardHeader className="py-3 px-4 bg-muted/40 border-b border-border">
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{deptName}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Managers */}
                    {managers.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Leadership</div>
                        {managers.map(m => (
                          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border shadow-sm">
                            <EmployeeAvatar name={m.name} email={m.email} className="w-8 h-8" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate leading-tight">{m.name}</div>
                              <div className="text-[10px] text-primary truncate leading-tight">{m.role || 'Manager'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Staff */}
                    {staff.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team Members</div>
                        <div className="space-y-1">
                          {staff.map(s => (
                            <div key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors">
                              <EmployeeAvatar name={s.name} email={s.email} className="w-6 h-6 border shadow-sm" />
                              <div className="text-xs truncate">{s.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
