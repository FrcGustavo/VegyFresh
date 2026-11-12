export interface ModalTabOption {
  value: number;
  label: string;
}

export interface ModalTabsNavigationProps {
  value: number;
  options: ModalTabOption[];
  onChange: (value: number) => void;
}
