import { all } from "redux-saga/effects";
import { signupSaga } from "./signupSaga";

export default function* rootSaga() {
  yield all([signupSaga()]);
}
