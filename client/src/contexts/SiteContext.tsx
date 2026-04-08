import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface Site {
  id: number;
  name: string;
  description?: string | null;
}

interface SiteContextValue {
  currentSiteId: number;
  setCurrentSiteId: (id: number) => void;
  sites: Site[];
  currentSite: Site | undefined;
  isLoading: boolean;
}

const SiteContext = createContext<SiteContextValue>({
  currentSiteId: 1,
  setCurrentSiteId: () => {},
  sites: [],
  currentSite: undefined,
  isLoading: false,
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [currentSiteId, setCurrentSiteIdState] = useState<number>(() => {
    const stored = localStorage.getItem("currentSiteId");
    return stored ? parseInt(stored, 10) : 1;
  });

  const { data: sites = [], isLoading } = trpc.sites.list.useQuery();

  const setCurrentSiteId = (id: number) => {
    setCurrentSiteIdState(id);
    localStorage.setItem("currentSiteId", String(id));
  };

  // 若儲存的 siteId 不在站點列表中，重設為第一個站點
  useEffect(() => {
    if (!isLoading && sites.length > 0) {
      const valid = sites.find((s) => s.id === currentSiteId);
      if (!valid) {
        setCurrentSiteId(sites[0].id);
      }
    }
  }, [sites, isLoading, currentSiteId]);

  const currentSite = sites.find((s) => s.id === currentSiteId);

  return (
    <SiteContext.Provider value={{ currentSiteId, setCurrentSiteId, sites, currentSite, isLoading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
