import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const updateFactmanUsername = createAsyncThunk(
  "factmanSettings/updateUsername",
  async ({ newUsername }, { rejectWithValue }) => {
    try {
      const response = await axios.put("/api/factman/settings/update-username", { newUsername });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update username");
    }
  }
);

export const updateFactmanPassword = createAsyncThunk(
  "factmanSettings/updatePassword",
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.put("/api/factman/settings/update-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update password");
    }
  }
);

const factmanSettingsSlice = createSlice({
  name: "factmanSettings",
  initialState: {
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateFactmanUsername.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFactmanUsername.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateFactmanUsername.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateFactmanPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFactmanPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateFactmanPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default factmanSettingsSlice.reducer;