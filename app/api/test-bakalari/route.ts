import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { bakalariUrl, username, password } = await request.json()

    if (!bakalariUrl || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("Testing Bakalari connection to:", bakalariUrl)

    // Test the login endpoint
    const loginUrl = new URL("/api/login", bakalariUrl).toString()
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
    })

    console.log("Response status:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("Login successful")
      
      // Test user data endpoint
      const userDataUrl = new URL("/api/3/user", bakalariUrl).toString()
      const userResponse = await fetch(userDataUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${data.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "*/*",
        },
        cache: "no-store"
      })

      let userData = null
      if (userResponse.ok) {
        userData = await userResponse.json()
      }

      return NextResponse.json({
        success: true,
        bakalariUrl,
        loginStatus: response.status,
        userDataStatus: userResponse.status,
        userData: userData,
        message: "Bakalari connection successful"
      })
    } else {
      const errorText = await response.text()
      console.log("Login failed:", response.status, errorText)
      
      return NextResponse.json({
        success: false,
        bakalariUrl,
        status: response.status,
        error: errorText,
        message: "Bakalari login failed"
      })
    }
  } catch (error) {
    console.error("Test Bakalari error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Network or configuration error"
      },
      { status: 500 }
    )
  }
}
