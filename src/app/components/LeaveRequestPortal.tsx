import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Calendar, CalendarDays, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { createLeaveRequest, getLeaveRequests } from "../api/leave";
import { getStoredUserProfile } from "../lib/userProfile";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  leaveType: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
  days: number;
}

export function LeaveRequestPortal() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fromDate: "",
    toDate: "",
    leaveType: "Casual",
    reason: "",
  });
  
  const currentUser = getStoredUserProfile();
  const leaveBalance = currentUser?.leaveBalance || 0;

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  const loadLeaveRequests = async () => {
    try {
      const requests = await getLeaveRequests();
      const myRequests = requests
        .filter(req => req.employeeId === currentUser?.id)
        .map(req => ({
          ...req,
          days: calculateDays(req.fromDate, req.toDate)
        }));
      setLeaveRequests(myRequests);
    } catch (error) {
      console.error("Failed to load leave requests:", error);
    }
  };

  const calculateDays = (fromDate: string, toDate: string): number => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromDate || !formData.toDate || !formData.reason) {
      toast.error("Please fill all required fields");
      return;
    }

    const requestedDays = calculateDays(formData.fromDate, formData.toDate);
    if (requestedDays > leaveBalance) {
      toast.error(`Requested ${requestedDays} days exceed your leave balance of ${leaveBalance} days`);
      return;
    }

    setLoading(true);
    try {
      await createLeaveRequest({
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        leaveType: formData.leaveType,
        reason: formData.reason,
      });
      
      toast.success("Leave request submitted successfully!");
      setShowForm(false);
      setFormData({ fromDate: "", toDate: "", leaveType: "Casual", reason: "" });
      loadLeaveRequests();
    } catch (error) {
      toast.error("Failed to submit leave request");
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800";
      case "Rejected": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return <CheckCircle className="w-4 h-4" />;
      case "Rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Leave Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-primary">{leaveBalance}</div>
              <p className="text-sm text-muted-foreground">Available Days</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {leaveRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.days, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Pending Days</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {leaveRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.days, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Approved Days</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowForm(!showForm)} 
            className="mt-4 w-full md:w-auto"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        </CardContent>
      </Card>

      {/* Leave Request Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, toDate: e.target.value }))}
                    min={formData.fromDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={formData.leaveType} onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casual">Casual Leave</SelectItem>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Earned">Earned Leave</SelectItem>
                    <SelectItem value="Maternity">Maternity Leave</SelectItem>
                    <SelectItem value="Paternity">Paternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Please provide a reason for your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  required
                />
              </div>
              
              {formData.fromDate && formData.toDate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Requesting {calculateDays(formData.fromDate, formData.toDate)} days
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No leave requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(request.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(request.status)}
                            {request.status}
                          </div>
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {request.days} days
                        </span>
                      </div>
                      <h3 className="font-medium">{request.leaveType} Leave</h3>
                      <p className="text-sm text-muted-foreground mb-1">{request.reason}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                        </span>
                        <span>Applied: {new Date(request.appliedOn).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
