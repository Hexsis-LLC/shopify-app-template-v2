import { z } from "zod";
import type { AnnouncementBannerData } from "../types/announcement";

const basicInfoSchema = z.object({
  size: z.enum(['large', 'medium', 'small', 'custom']),
  sizeHeight: z.string(),
  sizeWidth: z.string(),
  campaignTitle: z.string().min(1, "Campaign title is required"),
}).superRefine((data, ctx) => {
  if (data.size === 'custom') {
    // Validate height
    if (!data.sizeHeight || data.sizeHeight.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height is required for custom size",
        path: ['sizeHeight'],
      });
    } else if (isNaN(Number(data.sizeHeight)) || Number(data.sizeHeight) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height must be a positive number",
        path: ['sizeHeight'],
      });
    }

    // Validate width
    if (!data.sizeWidth || data.sizeWidth.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Width is required for custom size",
        path: ['sizeWidth'],
      });
    } else {
      const width = Number(data.sizeWidth);
      if (isNaN(width) || width <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Width must be a positive number",
          path: ['sizeWidth'],
        });
      } else if (width > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Width cannot be more than 100%",
          path: ['sizeWidth'],
        });
      }
    }
  }
});

// Common fields for all schedule types
const baseScheduleFields = {
  startType: z.enum(['now', 'specific']),
  endType: z.enum(['until_stop', 'specific']),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
};

const scheduleSchema = z.object(baseScheduleFields).superRefine((data, ctx) => {
  // Validate start date and time
  if (data.startType === 'specific') {
    if (!data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is required when start type is specific",
        path: ['startDate'],
      });
    }
    if (!data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time is required when start type is specific",
        path: ['startTime'],
      });
    }
  }

  // Validate end date and time
  if (data.endType === 'specific') {
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is required when end type is specific",
        path: ['endDate'],
      });
    }
    if (!data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time is required when end type is specific",
        path: ['endTime'],
      });
    }
  }

  // Validate that end date is after start date when both are specific
  if (data.startType === 'specific' && data.endType === 'specific' && data.startDate && data.endDate) {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ['endDate'],
      });
    } else if (data.startDate.getTime() === data.endDate.getTime() && data.startTime && data.endTime) {
      // If same day, check time
      const startTimeMinutes = convertTimeToMinutes(data.startTime);
      const endTimeMinutes = convertTimeToMinutes(data.endTime);
      if (startTimeMinutes >= endTimeMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be after start time",
          path: ['endTime'],
        });
      }
    }
  }
});

// Helper function to convert time string (HH:mm) to minutes
function convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const basicSchema = z.intersection(basicInfoSchema, scheduleSchema);

const textSchema = z.object({
  announcementText: z.string().min(1, "Campaign Message is required"),
  textColor: z.string(),
  fontSize: z.number().min(8).max(72),
  fontType: z.string(),
});

// Define CTA schema based on type
const ctaSchema = z.discriminatedUnion('ctaType', [
  // None type - no additional fields required
  z.object({
    ctaType: z.literal('none'),
    padding: z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
    }),
    fontType: z.string(),
    buttonFontColor: z.string().optional(),
    buttonBackgroundColor: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
  }),
  // Clickable link type - requires text and link
  z.object({
    ctaType: z.literal('link'),
    ctaText: z.string().min(1, "CTA text is required for link type"),
    ctaLink: z.string().url("Please enter a valid URL"),
    padding: z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
    }),
    fontType: z.string(),
    buttonFontColor: z.string().optional(),
    buttonBackgroundColor: z.string().optional(),
  }),
  // Clickable bar type - requires only link
  z.object({
    ctaType: z.literal('bar'),
    ctaLink: z.string().url("Please enter a valid URL"),
    padding: z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
    }),
    fontType: z.string(),
    buttonFontColor: z.string().optional(),
    buttonBackgroundColor: z.string().optional(),
    ctaText: z.string().optional(),
  }),
  // Regular button type - requires all fields
  z.object({
    ctaType: z.literal('regular'),
    ctaText: z.string().min(1, "CTA text is required for button type"),
    ctaLink: z.string().url("Please enter a valid URL"),
    padding: z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
    }),
    fontType: z.string(),
    buttonFontColor: z.string(),
    buttonBackgroundColor: z.string(),
  }),
]);

const backgroundSchema = z.object({
  backgroundType: z.string(),
  color1: z.string(),
  color2: z.string(),
  color3: z.string(),
  pattern: z.string(),
  paddingRight: z.number().min(0),
});

const otherSchema = z.object({
  closeButtonPosition: z.enum(['right', 'left']),
  displayBeforeDelay: z.string(),
  showAfterClosing: z.string(),
  showAfterCTA: z.string(),
  selectedPages: z.array(z.string()).default(["__global"]).transform(pages => 
    pages.length === 0 ? ["__global"] : pages
  ),
  campaignTiming: z.string(),
});

export const announcementSchema = z.object({
  basic: basicSchema,
  text: textSchema,
  cta: ctaSchema,
  background: backgroundSchema,
  other: otherSchema,
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

export function validateAnnouncement(data: unknown): AnnouncementBannerData {
  const validated = announcementSchema.parse(data);
  
  // Ensure selectedPages is __global when empty
  if (validated.other.selectedPages.length === 0) {
    validated.other.selectedPages = ["__global"];
  }
  
  return validated as AnnouncementBannerData;
}
