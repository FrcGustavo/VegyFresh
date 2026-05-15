import { useState, useEffect } from 'react';

export function usePagination<T>(items: T[], defaultRowsPerPage = 10) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Reset to first page whenever the item list changes (e.g. after a search)
  useEffect(() => {
    setPage(0);
  }, [items]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginated = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return { page, rowsPerPage, paginated, handleChangePage, handleChangeRowsPerPage };
}
