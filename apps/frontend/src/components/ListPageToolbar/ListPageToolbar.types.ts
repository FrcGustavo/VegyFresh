export interface ListPageToolbarConfig {
  createdFilter?: "all" | "today" | "range";
  createdFrom?: string;
  createdTo?: string;
  onCreatedFilterChange?: (value: "all" | "today" | "range") => void;
  onCreatedFromChange?: (value: string) => void;
  onCreatedToChange?: (value: string) => void;
  createLabel: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreate: () => void;
}

export interface ListPageToolbarProps {
  config: ListPageToolbarConfig | null;
}
