import jwt from "jsonwebtoken";
import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/auth");

export const JWTSubAuthorizer = {
    /*
    Return the credential from the request

    You have the WHOLE req object to interrogate
     */
    getCredential: (req) => {
      const authHeader = req.headers.authorization;
        if (authHeader === null || authHeader === undefined) {
            return null;
        }

        if (authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7, authHeader.length);

            const dToken = jwt.decode(token);

            return dToken["sub"];
        } else {
            logger.error("Missing Bearer Token");
            return null;
        }
    },

    /*
        Add metadata so that reads can vetted against credentials
     */
    secureData: (req, data) => {
        data.authorized_readers = [JWTSubAuthorizer.getCredential(req)];
        return data;
    },

    /*
    Modifies the response object so that it forwards the auth creds on behalf of the user.
     */
    authorizeResponse: (req, res) => {
      if (req.headers.authorization !== undefined) {
        res.header("Authorization", req.headers.authorization);
      }
      return res;
    },

    /*
    Vets the data against the request object to decide if the request has permission to see the data
     */
    isAuthorized: (req, data) => {
      const subscriber = JWTSubAuthorizer.getCredential(req)
      if (data === undefined) throw new Error("Nothing to Authorize");
      return (
          subscriber === undefined || //internal or a test (hasn't gone through gateway)
          subscriber === null ||
          data.authorized_readers.length === 0 || //everyone can read
          data.authorized_readers.includes(subscriber)
      ); //current sub is in the list
    },

    /*
    Modifies the query used for reads / lists so that it only grabs data that the request is authorized to see.

    In both those methods the data returned from storage is still vetted against isAuthorized so that you can
     use more than database queries to authorize the data.
     */
    secureRead: (req, query) => {
        let subscriber = JWTSubAuthorizer.getCredential(req)
        if (subscriber !== undefined && subscriber !== null) {
            query.authorized_readers = { $in: [subscriber] };
        }

        return query;
    }
};

export const NoOpAuthorizer = {

    getCredential: (req) => null,

    secureData: (req, data) =>  data,

    authorizeResponse: (req, res) => res,

    isAuthorized: (req, data) => true,

    secureRead: (req, query) =>  query
};