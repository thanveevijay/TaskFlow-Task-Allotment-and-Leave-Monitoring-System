import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { User, Mail, Phone, Building, Calendar, Award } from "lucide-react";
import { getStoredUserProfile, setStoredUserProfile } from "../lib/userProfile";
import { updateMyProfile, uploadMyAvatar } from "../api/auth";
import { toast } from "sonner";

export function EmployeeProfile() {
  const profile = getStoredUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    phone: (profile as any)?.phone || "",
    department: profile?.department || "",
    jobRole: (profile as any)?.jobRole || profile?.role || "",
    bio: (profile as any)?.bio || "",
    address: (profile as any)?.address || "",
    emergencyContact: (profile as any)?.emergencyContact || "",
  });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      await updateMyProfile(formData);
      setStoredUserProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
    setLoading(false);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !profile) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      
      const result = await uploadMyAvatar(avatarFile);
      setStoredUserProfile({ ...profile, avatarUrl: result.avatarUrl });
      toast.success("Avatar uploaded successfully!");
      setAvatarFile(null);
    } catch (error) {
      toast.error("Failed to upload avatar");
    }
    setLoading(false);
  };

  const achievements = [
    { name: "Task Master", description: "Completed 50+ tasks", icon: "Award" },
    { name: "Team Player", description: "Received 10+ kudos", icon: "Users" },
    { name: "Punctual", description: "95% on-time completion", icon: "Clock" },
    { name: "Innovator", description: "Suggested 5+ improvements", icon: "Lightbulb" },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              My Profile
            </CardTitle>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={loading}
            >
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-600 to-blue-900 flex items-center justify-center text-white text-2xl font-bold">
                {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  {avatarFile && (
                    <Button size="sm" onClick={handleAvatarUpload} disabled={loading}>
                      Upload Avatar
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  {isEditing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profile?.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{profile?.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{(profile as any)?.phone || "Not provided"}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    {isEditing ? (
                      <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{profile?.department}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Tell us about yourself..."
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Job Role</Label>
              <p className="font-medium">{(profile as any)?.jobRole || profile?.role}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Employee ID</Label>
              <p className="font-medium">{profile?.id?.slice(-8).toUpperCase()}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Join Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <p className="font-medium">
                  {(profile as any)?.createdAt ? new Date((profile as any).createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Achievements & Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-medium">{achievement.name}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
