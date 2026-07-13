import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { startLogin } from "@/const";
import { Loader2, Users, UserPlus, UserMinus } from "lucide-react";
import { useParams, useRoute } from "wouter";

export default function TenantMembers() {
  const { user, loading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute<{ tenantId: string }>("/admin/tenants/:tenantId/members");
  const tenantId = params?.tenantId ? parseInt(params.tenantId) : 0;

  const utils = trpc.useUtils();
  const membersQuery = trpc.memberships.list.useQuery({ tenantId }, { enabled: !!tenantId && isAuthenticated });
  const myTenantsQuery = trpc.memberships.myTenants.useQuery(undefined, { enabled: isAuthenticated });
  const allUsersQuery = trpc.system.users.useQuery(undefined, { enabled: isAuthenticated }); // if available

  const addMemberMutation = trpc.memberships.addMember.useMutation({
    onSuccess: () => {
      utils.memberships.list.invalidate({ tenantId });
      utils.memberships.myTenants.invalidate();
      toast.success("Membro adicionado com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = trpc.memberships.removeMember.useMutation({
    onSuccess: () => {
      utils.memberships.list.invalidate({ tenantId });
      utils.memberships.myTenants.invalidate();
      toast.success("Membro removido!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");

  const handleAdd = () => {
    if (!selectedUserId) return;
    addMemberMutation.mutate({
      tenantId,
      userId: parseInt(selectedUserId),
      role: selectedRole,
    });
    setOpenAdd(false);
    setSelectedUserId("");
    setSelectedRole("member");
  };

  const handleRemove = (userId: number) => {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    removeMemberMutation.mutate({ tenantId, userId });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={startLogin}>Entrar</Button>
      </div>
    );
  }

  // Verificar se o usuário é admin do tenant
  const myTenant = myTenantsQuery.data?.find(t => t.id === tenantId);
  const isAdminOfTenant = myTenant?.role === "admin" || user?.role === "admin";

  if (!isAdminOfTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para gerenciar os membros deste tenant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8" />
              Membros do Tenant
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os membros deste espaço. Regra: apenas 1 admin por tenant.
            </p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsersQuery.data?.map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name || u.email || `ID: ${u.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecione um usuário já registrado na plataforma
                  </p>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-600 mt-1">
                    Atenção: apenas 1 admin é permitido por tenant
                  </p>
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={addMemberMutation.isPending || !selectedUserId}
                  className="w-full"
                >
                  {addMemberMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Membros ({membersQuery.data?.length ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : membersQuery.data?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum membro neste tenant.</p>
            ) : (
              <div className="space-y-3">
                {membersQuery.data?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {member.userName || member.userEmail || `User #${member.userId}`}
                        </p>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role === "admin" ? "Admin" : "Membro"}
                        </Badge>
                      </div>
                      {member.userEmail && (
                        <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.userId)}
                      disabled={
                        removeMemberMutation.isPending ||
                        (member.role === "admin" &&
                          membersQuery.data?.filter(m => m.role === "admin").length <= 1)
                      }
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info box sobre regra de 1 admin */}
        <Card className="mt-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Regra de negócio:</strong> Cada tenant possui exatamente 1 administrador.
              Se o admin existente for removido, outro membro pode ser promovido a admin.
              A tentativa de criar um segundo admin é bloqueada automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
