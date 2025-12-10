import { createSlice } from "@reduxjs/toolkit";

const signupSlice = createSlice({
  name: "signup",
  initialState: {
    loading: false,
    success: false,
    user: null,
    error: null,
  login: [],
  },

  reducers: {
    signupRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.success = false;
    },
    signupSuccess: (state, action) => {
      state.loading = false;
      state.success = true;
      state.user = action.payload;
    },
    signupFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
     loginRequest: (state, action) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.login = action.payload;
      state.token = action.payload.token;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { signupRequest, signupSuccess, signupFailure,
    loginRequest, loginSuccess, loginFailure
 } =signupSlice.actions;

export default signupSlice.reducer;
