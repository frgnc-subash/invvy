import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  PackageSearch,
} from 'lucide-react';
import { DEMO_EMAIL } from '../App';
import { getMe, invalidateApiCache, TOKEN_KEY } from '../api';
import type { User } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
} from './ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from './ui/sidebar';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/inventories', label: 'Inventories', icon: Boxes, end: false },
  { to: '/items', label: 'All Items', icon: PackageSearch, end: true },
];

function SidebarAutoCollapse() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    if (previousPathname.current === location.pathname) {
      return;
    }

    previousPathname.current = location.pathname;

    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, location.pathname, setOpenMobile]);

  return null;
}

export default function AppLayout() {
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();
  const signedInEmail = user?.email || DEMO_EMAIL;

  useEffect(() => {
    const storedTheme = localStorage.getItem('invvy-theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
  }, []);

  const handleLogout = () => {
    invalidateApiCache();
    localStorage.removeItem(TOKEN_KEY);
    window.location.assign('/login');
  };

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const data = await getMe();
        if (active) setUser(data);
      } catch {
        if (active) setUser(null);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SidebarProvider>
      <SidebarAutoCollapse />
      <Sidebar collapsible="icon" className="border-r border-sidebar-border/70 bg-sidebar/95">
        <SidebarHeader className="p-2">
          <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <Link
              to="/"
              className="flex h-11 items-center gap-3 rounded-lg px-2 text-sidebar-foreground transition-none hover:bg-transparent hover:text-sidebar-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              aria-label="Go to dashboard"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <BarChart3 className="size-4" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-base font-semibold">invvy</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Inventory workspace</span>
              </span>
            </Link>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
              Workspace
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ to, label, icon: Icon, end }) => {
                  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className="rounded-lg px-3 py-2.5"
                      >
                        <NavLink to={to} end={end}>
                          <Icon />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={signedInEmail} className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{signedInEmail.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name || 'User'}</span>
                      <span className="truncate text-xs">{signedInEmail}</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side="top" align="start" sideOffset={4}>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">{signedInEmail.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.name || 'User'}</span>
                        <span className="truncate text-xs">{signedInEmail}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
