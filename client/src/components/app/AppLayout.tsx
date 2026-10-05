import type { ReactNode } from "react";

import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({
  children,
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50">

      <div className="flex min-h-screen">

        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">

          <AppHeader />

          <main className="flex-1 px-6 py-8 lg:px-8">
            {children}
          </main>

        </div>

      </div>

    </div>
  );
};

export default AppLayout;