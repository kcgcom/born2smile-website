"use client";

import { createContext, useContext, useState } from "react";

interface ResearchEditContextValue {
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
}

const ResearchEditContext = createContext<ResearchEditContextValue>({
  isEditMode: false,
  setIsEditMode: () => {},
});

export const useResearchEdit = () => useContext(ResearchEditContext);

export function ResearchEditProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  return (
    <ResearchEditContext.Provider value={{ isEditMode, setIsEditMode }}>
      {children}
    </ResearchEditContext.Provider>
  );
}
