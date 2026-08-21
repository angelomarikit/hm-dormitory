import { isFilled } from '@/utils/cn'
import type {
  Amenity,
  Announcement,
  Faq,
  Floor,
  HouseRule,
  Rate,
  RoomWithRelations,
  Site,
} from '@/types/database'

const now = '2026-08-20T00:00:00.000Z'

export const SAMPLE_HERO_IMAGE =
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80'
export const SAMPLE_ROOM_IMAGE_1 =
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80'
export const SAMPLE_ROOM_IMAGE_2 =
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'
export const SAMPLE_ROOM_IMAGE_3 =
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80'
export const SAMPLE_AMENITY_WIFI =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'
export const SAMPLE_AMENITY_PARKING =
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80'
export const SAMPLE_AMENITY_LAUNDRY =
  'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=900&q=80'
export const SAMPLE_AMENITY_STUDY =
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80'
export const SAMPLE_AMENITY_SECURITY =
  'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=900&q=80'
export const SAMPLE_AMENITY_COMMON =
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80'

export function mergeSiteWithPlaceholders(site: Site): Site {
  return {
    ...site,
    short_description:
      site.short_description?.trim() ||
      'Comfortable boarding rooms in a well-kept residential setting. Sample description for layout preview.',
    hero_heading: site.hero_heading?.trim() || 'A quiet place to stay.',
    hero_subheading:
      site.hero_subheading?.trim() ||
      'See available rooms, bed spaces, amenities, and boarding information in one page.',
    hero_image_url: site.hero_image_url || site.building_image_url || SAMPLE_HERO_IMAGE,
    building_image_url: site.building_image_url || SAMPLE_HERO_IMAGE,
    address: site.address?.trim() || '123 Sample Street, Sample City, Metro Manila',
    phone: site.phone?.trim() || '+63 900 000 0000',
    email: site.email?.trim() || 'hello@example.com',
    facebook_url: site.facebook_url?.trim() || 'https://facebook.com',
    messenger_url: site.messenger_url?.trim() || 'https://m.me/example',
    registration_url: site.registration_url?.trim() || 'https://www.google.com/forms/about/',
    google_maps_embed_url:
      site.google_maps_embed_url?.trim() ||
      'https://maps.google.com/maps?q=Manila+Philippines&z=14&output=embed',
    google_maps_directions_url:
      site.google_maps_directions_url?.trim() ||
      'https://www.google.com/maps/dir/?api=1&destination=Manila%2C%20Philippines',
  }
}

export function placeholderAnnouncements(siteId: string): Announcement[] {
  return [
    {
      id: 'sample-announcement-1',
      site_id: siteId,
      title: 'Welcome, new boarders',
      content:
        'This is a sample announcement. Replace it in Admin → Announcements. Use this space for move-in dates, reminders, or important house updates.',
      is_important: true,
      is_published: true,
      published_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-announcement-2',
      site_id: siteId,
      title: 'Payment reminder (sample)',
      content:
        'Monthly boarding fees are typically collected at the start of the month. Update this with the actual payment schedule.',
      is_important: false,
      is_published: true,
      published_at: now,
      created_at: now,
      updated_at: now,
    },
  ]
}

export function placeholderFloors(siteId: string): Floor[] {
  return [
    {
      id: 'sample-floor-1',
      site_id: siteId,
      name: 'Ground Floor',
      floor_number: 1,
      description: 'Ground-level rooms.',
      sort_order: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-floor-2',
      site_id: siteId,
      name: 'Second Floor',
      floor_number: 2,
      description: 'Second-floor rooms.',
      sort_order: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-floor-3',
      site_id: siteId,
      name: 'Third Floor',
      floor_number: 3,
      description: 'Third-floor rooms.',
      sort_order: 3,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]
}

export function placeholderRooms(siteId: string, floors: Floor[]): RoomWithRelations[] {
  const sourceFloors = floors.length > 0 ? floors : placeholderFloors(siteId)
  const samples: Array<{
    room_number: string
    capacity: number
    occupied_spaces: number
    image: string
    description: string
  }> = [
    {
      room_number: '101',
      capacity: 5,
      occupied_spaces: 3,
      image: SAMPLE_ROOM_IMAGE_1,
      description: 'Sample ground-floor room. Replace this with the real room photo, capacity, and description.',
    },
    {
      room_number: '201',
      capacity: 4,
      occupied_spaces: 4,
      image: SAMPLE_ROOM_IMAGE_2,
      description: 'Sample second-floor room shown as full so you can see the status badge.',
    },
    {
      room_number: '301',
      capacity: 6,
      occupied_spaces: 2,
      image: SAMPLE_ROOM_IMAGE_3,
      description: 'Sample third-floor room with available bed spaces.',
    },
  ]

  return samples.map((sample, index) => {
    const floor = sourceFloors[index] ?? sourceFloors[0]
    return {
      id: `sample-room-${sample.room_number}`,
      site_id: siteId,
      floor_id: floor.id,
      room_number: sample.room_number,
      room_name: `Sample Room ${sample.room_number}`,
      description: sample.description,
      capacity: sample.capacity,
      occupied_spaces: sample.occupied_spaces,
      sort_order: index + 1,
      is_active: true,
      created_at: now,
      updated_at: now,
      floors: {
        id: floor.id,
        name: floor.name,
        floor_number: floor.floor_number,
      },
      room_images: [
        {
          id: `sample-room-image-${sample.room_number}`,
          site_id: siteId,
          room_id: `sample-room-${sample.room_number}`,
          image_url: sample.image,
          alt_text: `Sample photo for Room ${sample.room_number}`,
          sort_order: 0,
          created_at: now,
        },
      ],
    }
  })
}

export function placeholderAmenities(siteId: string): Amenity[] {
  return [
    {
      id: 'sample-amenity-wifi',
      site_id: siteId,
      name: 'Wi-Fi',
      description: 'Sample amenity. Replace with the actual internet setup.',
      image_url: SAMPLE_AMENITY_WIFI,
      sort_order: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-amenity-parking',
      site_id: siteId,
      name: 'Parking',
      description: 'Sample amenity. Confirm whether parking is available before keeping this.',
      image_url: SAMPLE_AMENITY_PARKING,
      sort_order: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-amenity-laundry',
      site_id: siteId,
      name: 'Laundry Area',
      description: 'Sample amenity for layout preview.',
      image_url: SAMPLE_AMENITY_LAUNDRY,
      sort_order: 3,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-amenity-study',
      site_id: siteId,
      name: 'Study Area',
      description: 'Sample amenity for layout preview.',
      image_url: SAMPLE_AMENITY_STUDY,
      sort_order: 4,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-amenity-security',
      site_id: siteId,
      name: 'CCTV / Security',
      description: 'Sample amenity for layout preview.',
      image_url: SAMPLE_AMENITY_SECURITY,
      sort_order: 5,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-amenity-common',
      site_id: siteId,
      name: 'Common Area',
      description: 'Sample amenity for layout preview.',
      image_url: SAMPLE_AMENITY_COMMON,
      sort_order: 6,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]
}

export function placeholderRate(siteId: string): Rate {
  return {
    id: 'sample-rate',
    site_id: siteId,
    monthly_rate: '₱0,000 / month',
    monthly_rate_label: 'Monthly boarding rate',
    electricity_information: 'Sample: electricity is billed separately based on actual use.',
    water_information: 'Sample: water charges will be confirmed with the owner.',
    other_fees: 'Sample: add association fees or other charges here if they apply.',
    deposit_information: 'Sample: a security deposit may be required upon moving in.',
    additional_notes: 'These figures are placeholders. Update them in Admin → Rates.',
    updated_at: now,
  }
}

export function placeholderFaqs(siteId: string): Faq[] {
  return [
    {
      id: 'sample-faq-1',
      site_id: siteId,
      question: 'How much is the monthly boarding rate?',
      answer: 'Sample answer. Add the official monthly rate in Admin → Rates and FAQs.',
      sort_order: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-faq-2',
      site_id: siteId,
      question: 'Are electricity and water included?',
      answer: 'Sample answer. Replace this with the actual utility arrangement.',
      sort_order: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-faq-3',
      site_id: siteId,
      question: 'How do I check if a room is available?',
      answer: 'Sample answer. Boarders can review the availability section above or message the owner.',
      sort_order: 3,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-faq-4',
      site_id: siteId,
      question: 'How do I register?',
      answer: 'Sample answer. Use the Registration Form button once the Google Form link is added in Settings.',
      sort_order: 4,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]
}

export function placeholderHouseRules(siteId: string): HouseRule[] {
  return [
    {
      id: 'sample-rule-1',
      site_id: siteId,
      title: 'Quiet hours',
      description: 'Sample rule. Replace with the official quiet hours.',
      sort_order: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-rule-2',
      site_id: siteId,
      title: 'Visitors',
      description: 'Sample rule. Replace with the official visitor policy.',
      sort_order: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-rule-3',
      site_id: siteId,
      title: 'Cleanliness',
      description: 'Sample rule. Replace with the official cleanliness guidelines.',
      sort_order: 3,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'sample-rule-4',
      site_id: siteId,
      title: 'Payments',
      description: 'Sample rule. Replace with the official payment schedule.',
      sort_order: 4,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]
}

export function isRateEmpty(rate: Rate | null): boolean {
  if (!rate) return true
  return ![
    rate.monthly_rate,
    rate.electricity_information,
    rate.water_information,
    rate.other_fees,
    rate.deposit_information,
    rate.additional_notes,
  ].some((value) => isFilled(value))
}

export function getSiteSampleFlags(site: Site) {
  return {
    hero: !isFilled(site.hero_heading) || (!site.hero_image_url && !site.building_image_url),
    location: !isFilled(site.address) || !isFilled(site.google_maps_embed_url),
    contact:
      !isFilled(site.phone) ||
      !isFilled(site.email) ||
      !isFilled(site.facebook_url) ||
      !isFilled(site.messenger_url) ||
      !isFilled(site.registration_url),
  }
}

export function resolveAmenityImage(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes('photo-1545173168-9f1942e6906f')) return SAMPLE_AMENITY_LAUNDRY
  if (url.includes('photo-1557597774-9d273bec7d14')) return SAMPLE_AMENITY_SECURITY
  return url
}

export function withFallback<T>(items: T[], fallback: T[]): { items: T[]; isSample: boolean } {
  if (items.length > 0) return { items, isSample: false }
  return { items: fallback, isSample: true }
}
