import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { startLogin } from "@/const";
import { Loader2, Plus, Users, Building2, Pencil, Trash2 } from "lucide-react";

export default function Tenants() {
  const { user, loading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  const utils = trpc.useUtils();
  const tenantsQuery = trpc.tenants.list.useQuery();
  const membershipsQuery = trpc.memberships.myTenants.useQuery(undefined, { enabled: isAuthenticated });

  const createTenantMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      toast.success("Tenant criado com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTenantMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      toast.success("Tenant atualizado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const addMemberMutation = trpc.memberships.addMember.useMutation({
    onSuccess: () => {
      utils.memberships.myTenants.invalidate();
      toast.success("Membro adicionado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<number | null>(null);
  const [openMembers, setOpenMembers] = useState<number | null>(null);

  // Form states
  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#1a73e8");

  const handleCreate = () => {
    createTenantMutation.mutate({
      slug: formSlug,
      name: formName,
      description: formDescription || undefined,
      primaryColor: formColor,
    });
    setOpenCreate(false);
    resetForm();
  };

  const handleEdit = (tenantId: number) => {
    const tenant = tenantsQuery.data?.find(t => t.id === openEdit);
    if (!tenant) return;
    updateTenantMutation.mutate({
      id: tenantId,
      name: formName,
      description: formDescription || undefined,
      primaryColor: formColor,
    });
    setOpenEdit(null);
    resetForm();
  };

  const resetForm = () => {
    setFormSlug("");
    setFormName("");
    setFormDescription("");
    setFormColor("#1a73e8");
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Tenants
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os espaços multi-tenant da plataforma.
            </p>
          </div>

          {/* Só admin global pode criar tenants */}
          {user?.role === "admin" && (
            <Dialog open={openCreate} onOpenChange={(v) => { setOpenCreate(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Tenant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Tenant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="slug">Slug (identificador)</Label>
                    <Input
                      id="slug"
                      placeholder="ex: liga-sul"
                      value={formSlug}
                      onChange={e => setFormSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usado na URL para identificar o espaço
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="ex: Liga Sul de Futebol"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      placeholder="Descrição do tenant"
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Cor Primária</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="color"
                        value={formColor}
                        onChange={e => setFormColor(e.target.value)}
                        className="h-10 w-10 rounded border"
                      />
                      <span className="text-sm text-muted-foreground">{formColor}</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createTenantMutation.isPending || !formSlug || !formName}
                    className="w-full"
                  >
                    {createTenantMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Tenant
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Meus Tenants */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meus Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membershipsQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : membershipsQuery.data?.length === 0 ? (
              <p className="text-muted-foreground">Você ainda não pertence a nenhum tenant.</p>
            ) : (
              <div className="grid gap-4">
                {membershipsQuery.data?.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    style={{ borderLeft: `4px solid ${t.primaryColor}` }}
                  >
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.slug}</p>
                    </div>
                    <Badge variant={t.role === "admin" ? "default" : "secondary"}>
                      {t.role === "admin" ? "Admin" : "Membro"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Todos os Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Todos os Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantsQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : tenantsQuery.data?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum tenant cadastrado.</p>
            ) : (
              <div className="grid gap-4">
                {tenantsQuery.data?.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    style={{ borderLeft: `4px solid ${tenant.primaryColor}` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{tenant.name}</p>
                        <Badge variant={tenant.isActive ? "default" : "secondary"}>
                          {tenant.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                      {tenant.description && (
                        <p className="text-xs text-muted-foreground mt-1">{tenant.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOpenMembers(tenant.id);
                          setFormName(tenant.name);
                          setFormDescription(tenant.description || "");
                          setFormColor(tenant.primaryColor);
                        }}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Membros
                      </Button>
                      {user?.role === "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOpenEdit(tenant.id);
                            setFormName(tenant.name);
                            setFormDescription(tenant.description || "");
                            setFormColor(tenant.primaryColor);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Editar Tenant */}
        <Dialog open={openEdit !== null} onOpenChange={(v) => { setOpenEdit(v ? openEdit : null); if (!v) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-desc">Descrição</Label>
                <Input
                  id="edit-desc"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="edit-color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="h-10 w-10 rounded border"
                  />
                  <span className="text-sm text-muted-foreground">{formColor}</span>
                </div>
              </div>
              <Button
                onClick={() => openEdit && handleEdit(openEdit)}
                disabled={updateTenantMutation.isPending || !formName}
                className="w-full"
              >
                {updateTenantMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
