import { createContext, useContext } from "react";
export const TrainingDraftContext = createContext({
  draft: null,
  setDraft: () => {},
});
export const useTrainingDraft = () => useContext(TrainingDraftContext);
