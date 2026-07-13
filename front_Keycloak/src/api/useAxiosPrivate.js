import { useEffect } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

const axiosPrivate = axios.create({
  baseURL: "http://localhost:5000",
});

const useAxiosPrivate = () => {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      async (config) => {
        if (!isSignedIn) return config;

        try {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.error("Token retrieval failed", err);
        }

        return config;
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
    };
  }, [getToken, isSignedIn]);

  return axiosPrivate;
};

export default useAxiosPrivate;