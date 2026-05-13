import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SnapshotFile {
  name: string;
  file: File;
}

interface SnapshotsState {
  snapshotFile: SnapshotFile | null;
  error:        string;
}

const initialState: SnapshotsState = {
  snapshotFile: null,
  error:        "",
};

const snapshotsSlice = createSlice({
  name: "snapshots",
  initialState,
  reducers: {
    setSnapshotFile(state, action: PayloadAction<File>) {
      const file = action.payload;
      state.snapshotFile = {
        name: file.name.replace('.csv', ''),
        file,
      };
      state.error = "";
    },
    clearSnapshotFile(state) {
      state.snapshotFile = null;
      state.error = "";
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = "";
    },
  },
});

export const { setSnapshotFile, clearSnapshotFile, setError, clearError } =
  snapshotsSlice.actions;
export default snapshotsSlice.reducer;
