import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminAuthAPI, ADMIN_TOKEN_KEY } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [verificationMode, setVerificationMode] = useState("user_link");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAuthAPI.listUsers();
      setUsers(res.data || []);
    } catch (e) {
      toast.error(e.message || "Failed to load users");
      if (e.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        navigate("/admin/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreating(true);
    try {
      const res = await adminAuthAPI.createUser(
        newEmail.trim().toLowerCase(),
        newPassword,
        newFirstName.trim(),
        newLastName.trim(),
        verificationMode
      );
      toast.success(res.message || "User created");
      if (res.initialPassword) {
        toast.info(`Copy initial password now: ${res.initialPassword}`, { duration: 20000 });
      }
      if (res.emailSent === false) {
        toast.warning("Verification email was not delivered — configure SMTP in backend/.env (see AUTH_SETUP.md).");
        if (res.verificationUrl) {
          toast.info(`Dev only — open this link to verify: ${res.verificationUrl}`, { duration: 120000 });
        }
      }
      setNewEmail("");
      setNewPassword("");
      setNewFirstName("");
      setNewLastName("");
      setVerificationMode("user_link");
      await load();
    } catch (err) {
      toast.error(err.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? They will no longer be able to sign in.")) return;
    try {
      await adminAuthAPI.deleteUser(id);
      toast.success("User deleted");
      await load();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleUpdatePassword = async (id) => {
    if (editPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setUpdating(true);
    try {
      await adminAuthAPI.updateUserPassword(id, editPassword);
      toast.success("Password updated");
      setEditingId(null);
      setEditPassword("");
    } catch (err) {
      toast.error(err.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleResend = async (id) => {
    try {
      const res = await adminAuthAPI.resendVerification(id);
      if (res.emailSent) {
        toast.success(res.message || "Verification email sent");
      } else {
        toast.warning(res.message || "Email was not sent");
        if (res.verificationUrl) {
          toast.info(`Dev only — open this link to verify: ${res.verificationUrl}`, { duration: 120000 });
        }
      }
    } catch (err) {
      toast.error(err.message || "Resend failed");
    }
  };

  const handleAdminVerify = async (id, email) => {
    if (
      !window.confirm(
        `Mark ${email} as verified without them opening the email link? They will be able to sign in immediately.`
      )
    ) {
      return;
    }
    try {
      const res = await adminAuthAPI.verifyUser(id);
      toast.success(res.message || "User verified");
      await load();
    } catch (err) {
      toast.error(err.message || "Verify failed");
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin — users</h1>
            <p className="text-sm text-muted-foreground">Create and delete dashboard users only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" asChild>
              <Link to="/dashboard">View dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/settings">Settings</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">User login</Link>
            </Button>
            <Button variant="secondary" onClick={logout}>
              Admin logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create user</CardTitle>
            <CardDescription>
              Initial password is returned once in a toast — save it. User resets password only via email link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newFirstName">First name</Label>
                <Input
                  id="newFirstName"
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="First name"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newLastName">Last name</Label>
                <Input
                  id="newLastName"
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Last name"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Initial password (min 8 chars)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Verification method</Label>
                <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="verificationMode"
                      value="user_link"
                      checked={verificationMode === "user_link"}
                      onChange={() => setVerificationMode("user_link")}
                    />
                    <span>
                      Verify from user – send email with verification link (user must click to activate).
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="verificationMode"
                      value="direct"
                      checked={verificationMode === "direct"}
                      onChange={() => setVerificationMode("direct")}
                    />
                    <span>
                      Direct verify – mark user verified immediately and email them that their account is active.
                    </span>
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create user"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>{loading ? "Loading…" : `${users.length} user(s)`}</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <>
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {[u.first_name, u.last_name].filter(Boolean).join(" ") || <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.email_verified_at ? "Yes" : "No"}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {!u.email_verified_at && (
                              <>
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleAdminVerify(u.id, u.email)}>
                                  Verify
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => handleResend(u.id)}>
                                  Resend verify
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditPassword(""); }}
                            >
                              {editingId === u.id ? "Cancel" : "Update password"}
                            </Button>
                            <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(u.id)}>
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                        {editingId === u.id && (
                          <TableRow key={`${u.id}-edit`}>
                            <TableCell colSpan={3}>
                              <div className="flex flex-col sm:flex-row gap-2 py-1">
                                <Input
                                  type="password"
                                  placeholder="New password (min 8 chars)"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  minLength={8}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={updating}
                                  onClick={() => handleUpdatePassword(u.id)}
                                >
                                  {updating ? "Saving…" : "Save password"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
