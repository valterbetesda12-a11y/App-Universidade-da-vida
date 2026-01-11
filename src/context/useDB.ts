import { useContext } from 'react';
import { DBContext } from './DBContext';

export const useDB = () => {
    const c = useContext(DBContext);
    if (!c) throw new Error("useDB must be used within a DBProvider");
    return c;
};
