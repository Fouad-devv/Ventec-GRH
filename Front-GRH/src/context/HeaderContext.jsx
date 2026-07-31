import { createContext, useContext, useState, useEffect } from 'react';

const HeaderContext = createContext({
  actions: null,    setActions: () => {},
  backButton: null, setBackButton: () => {},
});

export const HeaderProvider = ({ children }) => {
  const [actions, setActions] = useState(null);
  const [backButton, setBackButton] = useState(null);
  return (
    <HeaderContext.Provider value={{ actions, setActions, backButton, setBackButton }}>
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

export const usePageBack = (backNode) => {
  const { setBackButton } = useHeaderContext();
  useEffect(() => {
    setBackButton(backNode);
    return () => setBackButton(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
