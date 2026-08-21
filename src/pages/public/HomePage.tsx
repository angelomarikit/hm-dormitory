import { useEffect, useState } from 'react'
import { Hero } from '@/components/public/Hero'
import { AnnouncementsSection } from '@/components/public/AnnouncementsSection'
import { AvailabilityOverview } from '@/components/public/AvailabilityOverview'
import { RoomsSection } from '@/components/public/RoomsSection'
import { AmenitiesSection } from '@/components/public/AmenitiesSection'
import { RatesSection } from '@/components/public/RatesSection'
import { FaqSection } from '@/components/public/FaqSection'
import { HouseRulesSection } from '@/components/public/HouseRulesSection'
import { LocationSection } from '@/components/public/LocationSection'
import { ContactSection } from '@/components/public/ContactSection'
import { Seo } from '@/components/ui/Seo'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSite } from '@/contexts/SiteContext'
import { fetchPublishedAnnouncements } from '@/services/announcementService'
import { fetchActiveFloors } from '@/services/floorService'
import { buildAvailabilitySummary, fetchPublicRooms } from '@/services/roomService'
import { fetchActiveAmenities } from '@/services/amenityService'
import { fetchRate } from '@/services/rateService'
import { fetchActiveFaqs } from '@/services/faqService'
import { fetchActiveHouseRules } from '@/services/houseRuleService'
import {
  getSiteSampleFlags,
  isRateEmpty,
  mergeSiteWithPlaceholders,
  placeholderAmenities,
  placeholderAnnouncements,
  placeholderFaqs,
  placeholderFloors,
  placeholderHouseRules,
  placeholderRate,
  placeholderRooms,
  withFallback,
} from '@/data/placeholders'
import type { Amenity, Announcement, Faq, Floor, HouseRule, Rate, RoomWithRelations } from '@/types/database'

export default function HomePage() {
  const { site, siteId } = useSite()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [rate, setRate] = useState<Rate | null>(null)
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [rules, setRules] = useState<HouseRule[]>([])

  useEffect(() => {
    if (!siteId) return
    const id: string = siteId
    let cancelled = false

    async function load(currentSiteId: string) {
      setLoading(true)
      try {
        const [nextAnnouncements, nextFloors, nextRooms, nextAmenities, nextRate, nextFaqs, nextRules] =
          await Promise.all([
            fetchPublishedAnnouncements(currentSiteId),
            fetchActiveFloors(currentSiteId),
            fetchPublicRooms(currentSiteId),
            fetchActiveAmenities(currentSiteId),
            fetchRate(currentSiteId),
            fetchActiveFaqs(currentSiteId),
            fetchActiveHouseRules(currentSiteId),
          ])
        if (cancelled) return
        setAnnouncements(nextAnnouncements)
        setFloors(nextFloors)
        setRooms(nextRooms)
        setAmenities(nextAmenities)
        setRate(nextRate)
        setFaqs(nextFaqs)
        setRules(nextRules)
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(id)
    return () => {
      cancelled = true
    }
  }, [siteId])

  if (!site || !siteId) return null

  const displaySite = mergeSiteWithPlaceholders(site)
  const announcementData = withFallback(announcements, placeholderAnnouncements(siteId))
  const floorData = withFallback(floors, placeholderFloors(siteId))
  const roomData = withFallback(rooms, placeholderRooms(siteId, floorData.items))
  const amenityData = withFallback(amenities, placeholderAmenities(siteId))
  const rateIsSample = isRateEmpty(rate)
  const displayRate = rateIsSample ? placeholderRate(siteId) : rate
  const faqData = withFallback(faqs, placeholderFaqs(siteId))
  const ruleData = withFallback(rules, placeholderHouseRules(siteId))
  const siteSamples = getSiteSampleFlags(site)

  const summary = buildAvailabilitySummary(roomData.items, floorData.items)

  return (
    <>
      <Seo
        title={displaySite.name}
        description={displaySite.short_description || displaySite.hero_subheading}
        image={displaySite.hero_image_url || displaySite.logo_url}
        path="/"
      />
      {loading ? (
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Hero
            site={displaySite}
            availableSpaces={summary.availableSpaces}
            isSample={siteSamples.hero}
            onCheckAvailability={() => document.getElementById('availability')?.scrollIntoView()}
            onViewRooms={() => document.getElementById('rooms')?.scrollIntoView()}
          />
          <AnnouncementsSection announcements={announcementData.items} isSample={announcementData.isSample} />
          <AvailabilityOverview summary={summary} isSample={roomData.isSample} />
          <RoomsSection rooms={roomData.items} floors={floorData.items} isSample={roomData.isSample} />
          <AmenitiesSection amenities={amenityData.items} isSample={amenityData.isSample} />
          <RatesSection rate={displayRate} isSample={rateIsSample} />
          <FaqSection faqs={faqData.items} isSample={faqData.isSample} />
          <HouseRulesSection rules={ruleData.items} isSample={ruleData.isSample} />
          <LocationSection site={displaySite} isSample={siteSamples.location} />
          <ContactSection site={displaySite} isSample={siteSamples.contact} />
        </>
      )}
    </>
  )
}
