import {
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ReceiptText,
} from "lucide-react";
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/accountant/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    id: "transactions",
    label: "Transactions",
    path: "/accountant/transactions",
    icon: <ReceiptText className="w-5 h-5" />,
  },
  {
    id: "requests",
    label: "Requests",
    path: "/accountant/requests",
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    id: "reports",
    label: "Reports",
    path: "/accountant/reports",
    icon: <FileText className="w-5 h-5" />,
  },
];

function MenuItems({ setOpen }) {
  const navigate = useNavigate();

  return (
    <nav className="mt-6 flex flex-col gap-1">
      {menuItems.map((menuItem) => (
        <button
          key={menuItem.id}
          onClick={() => {
            navigate(menuItem.path);
            setOpen?.(false);
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {menuItem.icon}
          <span className="text-sm font-medium">{menuItem.label}</span>
        </button>
      ))}
    </nav>
  );
}

function AccountantSidebar({ open, setOpen }) {
  return (
    <Fragment>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="flex items-center gap-2">
              <ChartNoAxesCombined className="w-6 h-6" />
              <span className="text-lg font-bold">Finance Panel</span>
            </SheetTitle>
          </SheetHeader>
          <MenuItems setOpen={setOpen} />
        </SheetContent>
      </Sheet>

      <aside className="hidden w-64 flex-col border-r bg-background p-4 lg:flex">
        <div className="flex items-center gap-2 mb-6">
          <ChartNoAxesCombined className="w-6 h-6" />
          <h1 className="text-lg font-bold">Finance Panel</h1>
        </div>
        <MenuItems />
      </aside>
    </Fragment>
  );
}

export default AccountantSidebar;
