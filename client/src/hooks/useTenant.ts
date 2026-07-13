import { useEffect, useState } from "react";

export interface TenantInfo {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string;
  isActive: number;
}

/**
 * Hook para resolver o tenant atual a partir da URL.
 * Usa o path para extrair o slug do tenant (ex: /t/:slug/...)
 * ou faz fetch para /api/tenant/:slug
 */
export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extrair slug da URL - formato: /t/:slug/...
    const path = window.location.pathname;
    const match = path.match(/^\/t\/([^/]+)/);
    if (!match) {
      // Se não tem slug na URL, tenta usar um tenant padrão ou mostra erro
      setTenant(null);
      setLoading(false);
      return;
    }

    const slug = match[1];

    fetch(`/api/tenant/${encodeURIComponent(slug)}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Tenant não encontrado.");
          throw new Error("Erro ao carregar tenant.");
        }
        return res.json();
      })
      .then(data => {
        setTenant(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { tenant, loading, error };
}

/**
 * Hook para listar todos os tenants ativos (página de seleção)
 */
export function useTenantsList() {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tenants")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao listar tenants.");
        return res.json();
      })
      .then(data => {
        setTenants(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { tenants, loading, error };
}
