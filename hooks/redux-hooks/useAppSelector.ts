import { useSelector } from "react-redux";
import type { RootState } from "@/services/store/store";

export const useAppSelector = useSelector.withTypes<RootState>();
