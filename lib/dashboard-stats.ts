import { prisma } from "@/lib/db";
import { startOfMonth, startOfWeek, startOfDay, subDays } from "date-fns";
import { log, dbLog, emailLog, invoiceLog } from '@/lib/logger';
// import { dashboardCache, CacheKeys } from '@/lib/cache'; // Temporarily disabled for connection pooling test

export interface AdminStats {
  totalUsers: number;
  activeTeachers: number;
  activeStudents: number;
  totalLessons: number;
  lessonsThisMonth: number;
  revenueThisMonth: number;
  systemHealth: {
    uptime: number;
    healthIssues: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'user_created' | 'lesson_completed' | 'teacher_joined' | 'system_event' | 'invoice_generated' | 'email_sent';
    description: string;
    timestamp: Date | string;
    userEmail?: string;
  }>;
}

export interface UserStats {
  // For non-specific role users or fallback
  totalUsers: number;
  platformActivity: string;
  systemStatus: string;
}

/**
 * Get comprehensive admin statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  // Check cache first (temporarily disabled)
  // const cacheKey = 'admin:dashboard:stats';
  // const cached = dashboardCache.get(cacheKey);
  // if (cached) {
  //   return cached;
  // }
  
  try {
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const startOfThisWeek = startOfWeek(now);
    const sevenDaysAgo = subDays(now, 7);

    // Parallel queries for better performance
    const [
      totalUsers,
      activeTeachers,
      activeStudents,
      totalLessons,
      lessonsThisMonth,
      recentLessons,
      recentUsers,
      recentTeachers,
      recentInvoices
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active teachers (have at least one lesson or are recently active)
      prisma.teacherProfile.count({
        where: {
          isActive: true,
          OR: [
            {
              lessons: {
                some: {
                  date: {
                    gte: startOfThisMonth
                  }
                }
              }
            },
            {
              students: {
                some: {
                  isActive: true
                }
              }
            }
          ]
        }
      }),
      
      // Active students (have lessons this month or are recently active)
      prisma.studentProfile.count({
        where: {
          isActive: true,
          OR: [
            {
              lessons: {
                some: {
                  date: {
                    gte: startOfThisMonth
                  }
                }
              }
            },
            {
              joinedAt: {
                gte: startOfThisMonth
              }
            }
          ]
        }
      }),
      
      // Total lessons
      prisma.lesson.count(),
      
      // Lessons this month
      prisma.lesson.count({
        where: {
          date: {
            gte: startOfThisMonth
          }
        }
      }),
      
      // Recent lessons for activity feed
      prisma.lesson.findMany({
        where: {
          status: 'COMPLETED',
          date: {
            gte: sevenDaysAgo
          }
        },
        include: {
          student: {
            include: {
              user: true
            }
          },
          teacher: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: 5
      }),
      
      // Recent users
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 3
      }),
      
      // Recent teachers
      prisma.teacherProfile.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 3
      }),
      
      // Recent invoices
      prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        include: {
          teacher: {
            include: {
              user: true
            }
          },
          student: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })
    ]);

    // Calculate estimated monthly revenue (rough estimate based on lessons and average rates)
    const avgLessonRate = 6000; // $60 in cents - rough average
    const estimatedRevenue = lessonsThisMonth * avgLessonRate;

    // Build recent activity feed
    const recentActivity: AdminStats['recentActivity'] = [];
    
    // Add recent lessons
    recentLessons.forEach(lesson => {
      recentActivity.push({
        id: lesson.id,
        type: 'lesson_completed',
        description: `${lesson.student.user.name} completed a lesson with ${lesson.teacher.user.name}`,
        timestamp: lesson.date,
        userEmail: lesson.student.user.email
      });
    });
    
    // Add recent users
    recentUsers.forEach(user => {
      recentActivity.push({
        id: user.id,
        type: 'user_created',
        description: `New ${user.role.toLowerCase()} account created`,
        timestamp: user.createdAt,
        userEmail: user.email
      });
    });
    
    // Add recent teachers
    recentTeachers.forEach(teacher => {
      recentActivity.push({
        id: teacher.id,
        type: 'teacher_joined',
        description: `${teacher.user.name} joined as a teacher`,
        timestamp: teacher.createdAt,
        userEmail: teacher.user.email
      });
    });
    
    // Add recent invoices
    recentInvoices.forEach(invoice => {
      const studentName = invoice.student?.user?.name || invoice.customFullName || 'Custom Student';
      const studentEmail = invoice.student?.user?.email || invoice.customEmail;
      recentActivity.push({
        id: invoice.id,
        type: 'invoice_generated',
        description: `Invoice ${invoice.invoiceNumber} generated for ${studentName}`,
        timestamp: invoice.createdAt,
        userEmail: studentEmail || undefined
      });
    });

    // Sort by timestamp and limit
    recentActivity.sort((a, b) => {
      const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : new Date(a.timestamp).getTime();
      const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : new Date(b.timestamp).getTime();
      return bTime - aTime;
    });
    const limitedActivity = recentActivity.slice(0, 10);

    const stats = {
      totalUsers,
      activeTeachers,
      activeStudents,
      totalLessons,
      lessonsThisMonth,
      revenueThisMonth: estimatedRevenue,
      systemHealth: {
        uptime: 99.9, // Could be calculated from uptime monitoring
        healthIssues: 0 // Could come from system health checks
      },
      recentActivity: limitedActivity
    };
    
    // Cache the result for 2 minutes (temporarily disabled)
    // dashboardCache.set(cacheKey, stats, 1000 * 60 * 2);
    
    return stats;
  } catch (error) {
    log.error('Error fetching admin stats:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    // Return safe defaults on error
    return {
      totalUsers: 0,
      activeTeachers: 0,
      activeStudents: 0,
      totalLessons: 0,
      lessonsThisMonth: 0,
      revenueThisMonth: 0,
      systemHealth: {
        uptime: 0,
        healthIssues: 1
      },
      recentActivity: [{
        id: 'error',
        type: 'system_event',
        description: 'Unable to load admin statistics',
        timestamp: new Date()
      }]
    };
  }
}

/**
 * Get all activity with filtering options for admin activity page
 */
export async function getAllActivity(filters?: {
  dateRange?: 'today' | 'week' | 'month' | 'all';
  activityType?: 'user_created' | 'lesson_completed' | 'teacher_joined' | 'system_event' | 'invoice_generated' | 'email_sent' | 'all';
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'all';
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  activities: AdminStats['recentActivity'];
  totalCount: number;
}> {
  try {
    const {
      dateRange = 'month',
      activityType = 'all',
      userRole = 'all',
      userId,
      limit = 50,
      offset = 0
    } = filters || {};

    // Calculate date filter
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'all':
        startDate = undefined;
        break;
    }

    // Build where conditions for different activity types
    const lessonWhere: any = {
      ...(startDate && { date: { gte: startDate } }),
      status: 'COMPLETED'
    };

    const userWhere: any = {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(userRole !== 'all' && { role: userRole }),
      ...(userId && { id: userId })
    };

    const teacherWhere: any = {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(userId && { userId })
    };

    // Fetch different types of activities based on filter
    const activities: AdminStats['recentActivity'] = [];

    // Get lessons if needed
    if (activityType === 'all' || activityType === 'lesson_completed') {
      const lessons = await prisma.lesson.findMany({
        where: lessonWhere,
        include: {
          student: { include: { user: true } },
          teacher: { include: { user: true } }
        },
        orderBy: { date: 'desc' }
      });

      lessons.forEach(lesson => {
        activities.push({
          id: lesson.id,
          type: 'lesson_completed',
          description: `${lesson.student.user.name} completed a lesson with ${lesson.teacher.user.name}`,
          timestamp: lesson.date,
          userEmail: lesson.student.user.email
        });
      });
    }

    // Get users if needed
    if (activityType === 'all' || activityType === 'user_created') {
      const users = await prisma.user.findMany({
        where: userWhere,
        orderBy: { createdAt: 'desc' }
      });

      users.forEach(user => {
        activities.push({
          id: user.id,
          type: 'user_created',
          description: `New ${user.role.toLowerCase()} account created`,
          timestamp: user.createdAt,
          userEmail: user.email
        });
      });
    }

    // Get teachers if needed
    if (activityType === 'all' || activityType === 'teacher_joined') {
      const teachers = await prisma.teacherProfile.findMany({
        where: teacherWhere,
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });

      teachers.forEach(teacher => {
        activities.push({
          id: teacher.id,
          type: 'teacher_joined',
          description: `${teacher.user.name} joined as a teacher`,
          timestamp: teacher.createdAt,
          userEmail: teacher.user.email
        });
      });
    }

    // Get invoices if needed
    if (activityType === 'all' || activityType === 'invoice_generated') {
      const invoiceWhere: any = {
        ...(startDate && { createdAt: { gte: startDate } })
      };

      const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          teacher: { include: { user: true } },
          student: { include: { user: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      invoices.forEach(invoice => {
        const studentName = invoice.student?.user?.name || invoice.customFullName || 'Custom Student';
        const studentEmail = invoice.student?.user?.email || invoice.customEmail;
        activities.push({
          id: invoice.id,
          type: 'invoice_generated',
          description: `Invoice ${invoice.invoiceNumber} generated for ${studentName}`,
          timestamp: invoice.createdAt,
          userEmail: studentEmail || undefined
        });
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const totalCount = activities.length;
    const paginatedActivities = activities.slice(offset, offset + limit);

    return {
      activities: paginatedActivities,
      totalCount
    };

  } catch (error) {
    log.error('Error fetching all activity:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return {
      activities: [],
      totalCount: 0
    };
  }
}

/**
 * Get basic user stats for non-role-specific users
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    const totalUsers = await prisma.user.count();
    
    return {
      totalUsers,
      platformActivity: 'Active',
      systemStatus: 'Operational'
    };
  } catch (error) {
    log.error('Error fetching user stats:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return {
      totalUsers: 0,
      platformActivity: 'Unknown',
      systemStatus: 'Error'
    };
  }
}

/**
 * Format currency values for display
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Format relative time for activity feed
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(targetDate.getTime())) {
    return 'Unknown time';
  }
  
  const diff = now.getTime() - targetDate.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}