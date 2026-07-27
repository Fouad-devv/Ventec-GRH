import { createContext, useContext, useState, useEffect } from 'react';

const HeaderContext = createContext({ actions: null, setActions: () => {} });

export const HeaderProvider = ({ children }) => {
  const [actions, setActions] = useState(null);
  return (
    <HeaderContext.Provider value={{ actions, setActions }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeaderContext = () => useContext(HeaderContext);

export const usePageActions = (actionsNode) => {
  const { setActions } = useHeaderContext();
  useEffect(() => {
    setActions(actionsNode);
    return () => setActions(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
