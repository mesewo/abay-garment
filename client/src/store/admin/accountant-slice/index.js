import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  transactions: [],
  requests: [],
  stats: {},
  loading: false,
  error: null,
};

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message;

export const fetchAccountantTransactions = createAsyncThunk(
  "accountant/fetchTransactions",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/api/accountant/transactions");
      return data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchAccountantRequests = createAsyncThunk(
  "accountant/fetchRequests",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/api/accountant/requests");
      return data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchAccountantStats = createAsyncThunk(
  "accountant/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/api/accountant/stats");
      return data.stats;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const accountantSlice = createSlice({
  name: "accountant",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccountantTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccountantTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload || [];
      })
      .addCase(fetchAccountantTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load transactions";
      })
      .addCase(fetchAccountantRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccountantRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload || [];
      })
      .addCase(fetchAccountantRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load requests";
      })
      .addCase(fetchAccountantStats.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchAccountantStats.fulfilled, (state, action) => {
        state.stats = action.payload || {};
      })
      .addCase(fetchAccountantStats.rejected, (state, action) => {
        state.error = action.payload || "Failed to load stats";
      });
  },
});

export default accountantSlice.reducer;
