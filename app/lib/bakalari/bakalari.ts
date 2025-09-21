// Get Bakalari URL from environment variable or use default
const bakalariURL = process.env.BAKALARI_URL || "https://spsul.bakalari.cz";

/**
 * Interface for the login payload as returned by Bakalari.
 */
export interface IBakalariLoginPayload {
    "bak:ApiVersion": string;
    "bak:AppVersion": string;
    "bak:UserId": string;
    access_token: string;
    refresh_token: string;
    id_token?: string;
    token_type: string;
    expires_in: number;
    scope: string;
    Subjects?: object;
}

/**
 * Represents the response from the Bakalari login endpoint.
 * (See https://github.com/bakalari-api/bakalari-api-v3/blob/master/login.md for details.)
 */
export class BakalariLoginResponse {
    public apiVersion: string;
    public appVersion: string;
    public userId: string;
    public accessToken: string;
    public refreshToken: string;
    public idToken?: string;
    public tokenType: string;
    public expiresIn: number;
    public scope: string;

    constructor(data: IBakalariLoginPayload) {
        this.apiVersion = data["bak:ApiVersion"];
        this.appVersion = data["bak:AppVersion"];
        this.userId = data["bak:UserId"];
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.idToken = data.id_token;
        this.tokenType = data.token_type;
        this.expiresIn = data.expires_in;
        this.scope = data.scope;
    }
}

/**
 * Interface for the user data payload as returned by Bakalari.
 */
export interface IBakalariUserDataPayload {
    UserType: string;
    FullUserName: string;
    UserUID?: string;
    UserId?: string;
    Subjects?: object;
    Class?: {
        Id: string | null;
        Abbrev: string | null;
    };
}

/**
 * Represents the user data returned by Bakalari API.
 */
export class BakalariUserData {
    public userType: string;
    public fullUserName: string;
    public classAbbrev: string | null;
    public classId: string | null;
    public userID: string;

    constructor(data: IBakalariUserDataPayload) {
        this.userType = data.UserType;
        this.fullUserName = data.FullUserName;
        this.classAbbrev = data.Class && data.Class.Abbrev ? data.Class.Abbrev : null;
        this.classId = data.Class && data.Class.Id ? data.Class.Id : null;
        this.userID = data.UserUID || data.UserId || "";
    }
}

/**
 * Represents the status information of the overall login process.
 */
export class BakalariLoginStatus {
    public success: boolean;
    public loginFailed: boolean | null;
    public userDataFailed: boolean | null;

    constructor(success: boolean, loginFailed: boolean | null, userDataFailed: boolean | null) {
        this.success = success;
        this.loginFailed = loginFailed;
        this.userDataFailed = userDataFailed;
    }
}

/**
 * Wraps the overall result of the login process, including both status and user data.
 */
export class BakalariLoginReturn {
    public status: BakalariLoginStatus;
    public data: BakalariUserData | null;
    public accessToken: string | null;

    constructor(status: BakalariLoginStatus, data: BakalariUserData | null, accessToken: string | null) {
        this.status = status;
        this.data = data;
        this.accessToken = accessToken;
    }
}

/**
 * Logs into Bakalari Mobile API and returns the response as an instance of BakalariLoginResponse.
 *
 * @param username - Bakalari username.
 * @param password - Bakalari password.
 * @returns A promise that resolves to an instance of BakalariLoginResponse or null if the request failed.
 */
export const loginToBakalari = async (
    username: string,
    password: string
): Promise<BakalariLoginResponse | null> => {
    try {
        console.log("Attempting Bakalari login to:", bakalariURL)
        const loginUrl = new URL("/api/login", bakalariURL).toString()
        console.log("Login URL:", loginUrl)
        
        const response = await fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `client_id=ANDR&grant_type=password&username=${encodeURIComponent(
                username
            )}&password=${encodeURIComponent(password)}`,
            cache: "no-store"
        });

        console.log("Bakalari login response status:", response.status)
        
        if (response.ok) {
            const data: IBakalariLoginPayload = await response.json();
            console.log("Bakalari login successful")
            return new BakalariLoginResponse(data);
        } else {
            const errorText = await response.text()
            console.log("Bakalari login failed:", response.status, errorText)
            return null;
        }
    } catch (error) {
        console.error("Error in loginToBakalari function in @/lib/bakalari.ts");
        console.error(error);
        return null;
    }
};

/**
 * Accesses the Bakalari API and returns user data as an instance of BakalariUserData.
 *
 * @param accessToken - Access token obtained from the login.
 * @returns A promise that resolves to an instance of BakalariUserData or null if the request failed.
 */
export const getBakalariUserData = async (
    accessToken: string
): Promise<BakalariUserData | null> => {
    try {
        console.log("Fetching user data from:", new URL("/api/3/user", bakalariURL).toString())
        const response = await fetch(new URL("/api/3/user", bakalariURL).toString(), {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "cs-CZ,cs;q=0.9",
                "Connection": "keep-alive",
                "Host": "spsul.bakalari.cz",
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Mobile Safari/537.36" //* why is this needed?
            },
            cache: "no-store"
        });

        console.log("User data response status:", response.status)
        
        if (response.ok) {
            const data: IBakalariUserDataPayload = await response.json();
            console.log("User data received:", data)
            return new BakalariUserData(data);
        } else {
            const errorText = await response.text()
            console.log("User data fetch failed:", response.status, errorText)
            return null;
        }
    } catch (error) {
        console.error("Error in getBakalariUserData function in @/lib/bakalari.ts");
        console.error(error);
        return null;
    }
};

export const getBakalariSubjectData = async (
    accessToken: string 
): Promise<any | null> => {
    try {
        const response = await fetch(new URL("/api/3/subjects", bakalariURL).toString(), {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json",
                "Accept-Encoding": "gzip",
                "Accept-Language": "cs-CZ,cs;q=0.9",
                "Accept": "application/json",
                "Host": "spsul.bakalari.cz"
            },
            cache: "no-store"
        });

        if(response.ok) {
            const data = await response.json();
            return data;
        }
        else {
            return null
        }
    } catch (error) {
        console.error("Error in getBakalariSubjectData function in @/lib/bakalari.ts");
        console.error(error);
        return null;
    }
}

/**
 * Logs the user into Bakalari and fetches user data.
 *
 * @param username - The Bakalari username.
 * @param password - The Bakalari password.
 * @returns A promise that resolves to an instance of BakalariLoginReturn containing both status and user data.
 */
export const loginToBakalariAndFetchUserData = async (
    username: string,
    password: string
): Promise<BakalariLoginReturn> => {
    try {
        const loginResponse = await loginToBakalari(username, password);
        if (!loginResponse || !loginResponse.accessToken) {
            return new BakalariLoginReturn(
                new BakalariLoginStatus(false, true, null),
                null,
                null
            );
        }

        console.log("Login successful, fetching user data...")
        const userDataResponse = await getBakalariUserData(loginResponse.accessToken);
        console.log("User data response:", userDataResponse)
        
        if (!userDataResponse || !userDataResponse.userType) {
            console.log("User data fetch failed or invalid user type")
            return new BakalariLoginReturn(
                new BakalariLoginStatus(false, false, true),
                null,
                null
            );
        }

        console.log("User data successful, fetching subject data...")
        const getBakalariSubjectDataResponse = await getBakalariSubjectData(loginResponse.accessToken);
        console.log("Subject data response:", getBakalariSubjectDataResponse ? "success" : "failed")

        // Subject data is optional, don't fail if it's not available
        if(!getBakalariSubjectDataResponse) {
            console.log("Subject data not available, continuing without it")
        }

        // Prepare the final user data. For students, include the class abbreviation.
        const finalUserData = new BakalariUserData({
            UserType: userDataResponse.userType,
            FullUserName: userDataResponse.fullUserName,
            Class: { Abbrev: userDataResponse.userType === "student" ? userDataResponse.classAbbrev : null, Id: userDataResponse.classId },
            Subjects: getBakalariSubjectDataResponse,
            UserUID: userDataResponse.userID
        });

        return new BakalariLoginReturn(
            new BakalariLoginStatus(true, false, false),
            finalUserData,
            loginResponse.accessToken
        );
    } catch (error) {
        console.error("Error in loginToBakalariAndFetchUserData function in @/lib/bakalari.ts");
        console.error(error);
        return new BakalariLoginReturn(
            new BakalariLoginStatus(false, null, null),
            null,
            null
        );
    }
};