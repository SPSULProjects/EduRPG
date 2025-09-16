/**
 * Mock Bakaláři client for testing
 */

export interface MockBakalariUserData {
  userID: string
  userName: string
  userType: "student" | "teacher" | "operator"
  classAbbrev?: string
  email?: string
}

export interface MockBakalariClassData {
  id: string
  name: string
  grade: number
}

export interface MockBakalariSubjectData {
  id: string
  name: string
  abbreviation: string
}

export class MockBakalariClient {
  private users: MockBakalariUserData[] = []
  private classes: MockBakalariClassData[] = []
  private subjects: MockBakalariSubjectData[] = []
  private enrollments: Array<{ userId: string; classId: string; subjectId: string }> = []

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    // Mock users
    this.users = [
      {
        userID: "student1",
        userName: "Jan Novák",
        userType: "student",
        classAbbrev: "1A",
        email: "jan.novak@school.cz"
      },
      {
        userID: "student2", 
        userName: "Marie Svobodová",
        userType: "student",
        classAbbrev: "1A",
        email: "marie.svobodova@school.cz"
      },
      {
        userID: "teacher1",
        userName: "Petr Dvořák",
        userType: "teacher",
        email: "petr.dvorak@school.cz"
      },
      {
        userID: "operator1",
        userName: "Admin Admin",
        userType: "operator",
        email: "admin@school.cz"
      }
    ]

    // Mock classes
    this.classes = [
      { id: "class1", name: "1A", grade: 1 },
      { id: "class2", name: "2B", grade: 2 }
    ]

    // Mock subjects
    this.subjects = [
      { id: "subj1", name: "Matematika", abbreviation: "MAT" },
      { id: "subj2", name: "Český jazyk", abbreviation: "CJ" },
      { id: "subj3", name: "Anglický jazyk", abbreviation: "AJ" }
    ]

    // Mock enrollments
    this.enrollments = [
      { userId: "student1", classId: "class1", subjectId: "subj1" },
      { userId: "student1", classId: "class1", subjectId: "subj2" },
      { userId: "student2", classId: "class1", subjectId: "subj1" },
      { userId: "student2", classId: "class1", subjectId: "subj3" }
    ]
  }

  async authenticate(username: string, password: string): Promise<{ token: string; user: MockBakalariUserData }> {
    // Mock authentication - accept any credentials for testing
    const user = this.users.find(u => 
      u.userName.toLowerCase().includes(username.toLowerCase()) ||
      u.email?.toLowerCase().includes(username.toLowerCase())
    )

    if (!user) {
      throw new Error("Invalid credentials")
    }

    return {
      token: `mock_token_${user.userID}`,
      user
    }
  }

  async getUserData(token: string): Promise<MockBakalariUserData> {
    const userId = token.replace("mock_token_", "")
    const user = this.users.find(u => u.userID === userId)
    
    if (!user) {
      throw new Error("Invalid token")
    }

    return user
  }

  async getClasses(token: string): Promise<MockBakalariClassData[]> {
    this.validateToken(token)
    return [...this.classes]
  }

  async getSubjects(token: string): Promise<MockBakalariSubjectData[]> {
    this.validateToken(token)
    return [...this.subjects]
  }

  async getEnrollments(token: string): Promise<Array<{ userId: string; classId: string; subjectId: string }>> {
    this.validateToken(token)
    return [...this.enrollments]
  }

  private validateToken(token: string): void {
    if (!token.startsWith("mock_token_")) {
      throw new Error("Invalid token")
    }
  }

  // Test utilities
  addUser(user: MockBakalariUserData) {
    this.users.push(user)
  }

  addClass(cls: MockBakalariClassData) {
    this.classes.push(cls)
  }

  addSubject(subject: MockBakalariSubjectData) {
    this.subjects.push(subject)
  }

  clearData() {
    this.users = []
    this.classes = []
    this.subjects = []
    this.enrollments = []
  }

  reset() {
    this.clearData()
    this.seedMockData()
  }
}

// Global mock instance
export const mockBakalariClient = new MockBakalariClient()
