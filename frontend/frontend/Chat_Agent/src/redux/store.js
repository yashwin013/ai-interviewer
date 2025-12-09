import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import signupReducer from "../redux/auth/signupSlice";
import rootSaga from "./auth/rootSaga";

const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: {
    signup: signupReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export default store;
