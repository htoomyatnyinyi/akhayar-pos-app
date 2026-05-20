import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
  isContinuousScan: boolean;
}

const initialState: SettingsState = {
  isContinuousScan: false, // Default to Single Scan
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setContinuousScan: (state, action: PayloadAction<boolean>) => {
      state.isContinuousScan = action.payload;
    },
  },
});

export const { setContinuousScan } = settingsSlice.actions;
export default settingsSlice.reducer;
