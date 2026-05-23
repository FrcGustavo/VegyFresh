import { useEffect } from 'react';
import { useOutletContext } from 'react-router';

export interface ListPageToolbarConfig {
  createdFilter?: 'all' | 'today' | 'range';
  createdFrom?: string;
  createdTo?: string;
  onCreatedFilterChange?: (value: 'all' | 'today' | 'range') => void;
  onCreatedFromChange?: (value: string) => void;
  onCreatedToChange?: (value: string) => void;
  createLabel: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreate: () => void;
}

interface MainLayoutOutletContext {
  setListPageToolbarConfig: (config: ListPageToolbarConfig | null) => void;
}

export function useListPageToolbar(config: ListPageToolbarConfig | null) {
  const { setListPageToolbarConfig } = useOutletContext<MainLayoutOutletContext>();

  useEffect(() => {
    setListPageToolbarConfig(config);
  }, [config, setListPageToolbarConfig]);

  useEffect(
    () => () => {
      setListPageToolbarConfig(null);
    },
    [setListPageToolbarConfig],
  );
}
