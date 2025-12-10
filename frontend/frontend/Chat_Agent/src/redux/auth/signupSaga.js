import { call, put, takeLatest } from "redux-saga/effects";
import api from "../../api/api";
import {
  signupRequest,
  signupSuccess,
  signupFailure,
  loginRequest,
  loginSuccess,
  loginFailure,
} from "./signupSlice";

function signupApi(data) {
  return api.post("/auth/signup", data);
}



function* loginUserSaga(action) {
  try {
    const { email, password } = action.payload;
    const url = "/auth/login";

    const { data } = yield call(api.post, url, { email, password });

    yield put(loginSuccess(data));

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));

  } catch (error) {
    yield put(loginFailure(error.response?.data?.detail || "Login failed"));
  }
}

function* signupWorker(action) {
  try {
    const response = yield call(signupApi, action.payload);
    localStorage.setItem("token", response.data.token);

    yield put(signupSuccess(response.data));
  } catch (error) {
    yield put(signupFailure(error.response?.data?.message || "Signup failed"));
  }
}

export function* signupSaga() {
  yield takeLatest(signupRequest.type, signupWorker);
    yield takeLatest(loginRequest.type, loginUserSaga);

}
