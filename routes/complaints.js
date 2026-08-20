import { Router } from "express";
import {
  submitComplaint,
  getAllComplaints,
  aggregateComplaintType,
  sortDate,
  findOpenOrResolved,
  resolveComplaint,
  getComplaintById,
} from "../data/complaints.js";
import { getAllHotspots, getHotspotByAddress } from "../data/hotspots.js";
import { getCached311, getComplaintTrends } from "../data/nyc311.js";
import { getAddressHistory } from "../data/addressHistory.js";
import { isBookmarked } from "../data/users.js";
import { COMPLAINT_CATEGORIES, geocodePin } from "../helper.js";
import { publicError } from "../middleware/security.js";

const router = Router();

const TYPES = COMPLAINT_CATEGORIES;

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const PAGE_SIZE = 10;
const MAX_BROWSE_ITEMS = 1000;
const MAX_PAGE = MAX_BROWSE_ITEMS / PAGE_SIZE;

const parsePage = (value) => {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^\d+$/.test(value))
    throw "Invalid page number";
  const page = Number.parseInt(value, 10);
  if (page < 1 || page > MAX_PAGE)
    throw `Page must be between 1 and ${MAX_PAGE}`;
  return page;
};

// Show submit complaint form — login required
router.get("/submit", (req, res) => {
  if (!req.session.userId) return res.redirect("/users/login");
  return res.render("complaints/submit", {
    title: "Submit a Complaint",
    types: TYPES,
    boroughs: BOROUGHS,
  });
});

// Handle complaint form submission
router.post("/submit", async (req, res) => {
  if (!req.session.userId) return res.redirect("/users/login");
  const { address, borough, complaintType, description } = req.body;
  try {
    const complaint = await submitComplaint(
      req.session.userId,
      address,
      borough,
      complaintType,
      description,
    );
    return res.redirect(`/users/dashboard`);
  } catch (e) {
    return res.status(400).render("complaints/submit", {
      title: "Submit a Complaint",
      error: publicError(e),
      types: TYPES,
      boroughs: BOROUGHS,
    });
  }
});

router.route("/browse").get(async (req, res) => {
  try {
    const { borough, complaintType, from, to, search, sort, status } =
      req.query;
    const page = parsePage(req.query.page);
    if (sort && sort !== "Newest" && sort !== "Oldest")
      throw "Invalid sort option";
    const sortOrder = sort || "Newest";

    if (status && status !== "In Progress" && status !== "Closed")
      throw "Invalid status option";

    const filters = { borough, complaintType, from, to, search };

    const complaintList = await getAllComplaints(filters);
    const nyc311List = await getCached311(filters);

    let combinedList = complaintList
      .map((complaint) => ({ ...complaint, source: "user" }))
      .concat(nyc311List.map((complaint) => ({ ...complaint, source: "311" })));

    await sortDate(combinedList, sortOrder === "Newest" ? 1 : 0);
    combinedList = combinedList.slice(0, MAX_BROWSE_ITEMS);

    if (status) {
      combinedList = await findOpenOrResolved(combinedList, status);
    } else {
      combinedList = await findOpenOrResolved(combinedList, "In Progress");
    }

    const totPages = Math.ceil(combinedList.length / PAGE_SIZE);
    const startIndex = (page - 1) * PAGE_SIZE;
    const paginatedList = combinedList.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );

    let queryString = [];
    if (borough) {
      queryString.push(`borough=${encodeURIComponent(borough)}`);
    }
    if (complaintType) {
      queryString.push(`complaintType=${encodeURIComponent(complaintType)}`);
    }
    if (from) {
      queryString.push(`from=${encodeURIComponent(from)}`);
    }
    if (to) {
      queryString.push(`to=${encodeURIComponent(to)}`);
    }
    if (search) {
      queryString.push(`search=${encodeURIComponent(search)}`);
    }
    if (sort) {
      queryString.push(`sort=${encodeURIComponent(sort)}`);
    }
    if (status) {
      queryString.push(`status=${encodeURIComponent(status)}`);
    }

    if (queryString.length) {
      queryString = `&${queryString.join("&")}`;
    } else {
      queryString = "";
    }

    return res.render("complaints/browse", {
      complaints: paginatedList,
      currPage: page,
      totPages,
      hPrev: page > 1,
      hNext: page < totPages,
      prevPage: page - 1,
      nextPage: page + 1,
      borough,
      isManhattan: borough === "Manhattan",
      isBrooklyn: borough === "Brooklyn",
      isQueens: borough === "Queens",
      isBronx: borough === "Bronx",
      isStatenIsland: borough === "Staten Island",
      isLoudMusic: complaintType === "Loud Music/Party",
      isConstruction: complaintType === "Construction",
      isBarkingDog: complaintType === "Barking Dog",
      isVehicleIdling: complaintType === "Vehicle Idling",
      isLoudTalking: complaintType === "Loud Talking",
      isOther: complaintType === "Other",
      isNewest: sortOrder === "Newest",
      isOldest: sortOrder === "Oldest",
      isOpen: status === "In Progress",
      isClosed: status === "Closed",
      from,
      to,
      search,
      queryString,
    });
  } catch (e) {
    return res.status(typeof e === "string" ? 400 : 500).render("error", {
      message:
        typeof e === "string" ? e : "Complaints are temporarily unavailable.",
    });
  }
});

router.route("/hotspots").get(async (req, res) => {
  try {
    const { borough } = req.query;
    const page = parsePage(req.query.page);
    const filters = { borough };

    const hotspotList = await getAllHotspots(filters);

    const totPages = Math.ceil(hotspotList.length / PAGE_SIZE);
    const startIndex = (page - 1) * PAGE_SIZE;
    const paginatedList = hotspotList.slice(startIndex, startIndex + PAGE_SIZE);

    let queryString = [];
    if (borough) {
      queryString.push(`borough=${encodeURIComponent(borough)}`);
    }

    if (queryString.length) {
      queryString = `&${queryString.join("&")}`;
    } else {
      queryString = "";
    }

    let coords = [];

    for (let x of paginatedList) {
      let points = await geocodePin(`${x.address}, ${x.borough} NY`);
      coords.push(points);
    }

    return res.render("complaints/hotspots", {
      hotspots: paginatedList,
      currPage: page,
      maptilerKey: process.env.MAPTILER_API_KEY,
      coords: JSON.stringify(coords),
      totPages,
      hPrev: page > 1,
      hNext: page < totPages,
      prevPage: page - 1,
      nextPage: page + 1,
      borough,
      isManhattan: borough === "Manhattan",
      isBrooklyn: borough === "Brooklyn",
      isQueens: borough === "Queens",
      isBronx: borough === "Bronx",
      isStatenIsland: borough === "Staten Island",
      queryString,
    });
  } catch (e) {
    return res.status(typeof e === "string" ? 400 : 500).render("error", {
      message:
        typeof e === "string" ? e : "Hotspots are temporarily unavailable.",
    });
  }
});

router.get("/address", async (req, res) => {
  const { q } = req.query;
  const borough =
    typeof req.query.borough === "string" ? req.query.borough : "";
  const complaintType =
    typeof req.query.type === "string" ? req.query.type : "";
  const query = typeof q === "string" ? q : "";
  const addressView = {
    title: "Address History",
    query,
    borough,
    selectedComplaintType: complaintType,
    isManhattan: borough.toUpperCase() === "MANHATTAN",
    isBrooklyn: borough.toUpperCase() === "BROOKLYN",
    isQueens: borough.toUpperCase() === "QUEENS",
    isBronx: borough.toUpperCase() === "BRONX",
    isStatenIsland: borough.toUpperCase() === "STATEN ISLAND",
  };

  if (!query.trim()) {
    return res.render("complaints/address", {
      ...addressView,
      results: [],
      hasSearched: false,
    });
  }

  try {
    const data = await getAddressHistory(query, borough, complaintType);
    const buildAddressHistoryUrl = (type = "") => {
      const params = new URLSearchParams({ q: data.query });

      if (data.borough) {
        params.set("borough", data.borough);
      }

      if (type) {
        params.set("type", type);
      }

      return `/complaints/address?${params.toString()}`;
    };
    const typeBreakdown = data.typeBreakdown.map((item) => ({
      ...item,
      url: buildAddressHistoryUrl(item.complaintType),
      isActive: item.complaintType === data.selectedComplaintType,
    }));

    return res.render("complaints/address", {
      ...addressView,
      ...data,
      typeBreakdown,
      allComplaintsUrl: buildAddressHistoryUrl(),
    });
  } catch (e) {
    const isValidationError = typeof e === "string";
    return res
      .status(isValidationError ? 400 : 500)
      .render("complaints/address", {
        ...addressView,
        error: isValidationError
          ? e
          : "Address history is temporarily unavailable. Please try again.",
        results: [],
        hasSearched: false,
        hasResults: false,
      });
  }
});

// Complaint trends over time
router.get("/trends", async (req, res) => {
  const { borough } = req.query;
  try {
    const trends = await getComplaintTrends(borough);
    return res.render("complaints/trends", {
      title: "Complaint Trends",
      trends,
      borough,
      boroughs: ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
      isManhattan: borough === "Manhattan",
      isBrooklyn: borough === "Brooklyn",
      isQueens: borough === "Queens",
      isBronx: borough === "Bronx",
      isStatenIsland: borough === "Staten Island",
    });
  } catch (e) {
    return res.status(typeof e === "string" ? 400 : 500).render("error", {
      message: publicError(e, "Complaint trends are temporarily unavailable"),
    });
  }
});

router.get("/common", async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const data_aggr = await aggregateComplaintType();
    const totPages = Math.ceil(data_aggr.length / PAGE_SIZE);
    const startIndex = (page - 1) * PAGE_SIZE;
    const paginatedList = data_aggr.slice(startIndex, startIndex + PAGE_SIZE);

    res.render("complaints/common", {
      data: paginatedList,
      currPage: page,
      totPages,
      hPrev: page > 1,
      hNext: page < totPages,
      prevPage: page - 1,
      nextPage: page + 1,
    });
  } catch (e) {
    return res.status(typeof e === "string" ? 400 : 500).render("error", {
      message: publicError(
        e,
        "Complaint statistics are temporarily unavailable",
      ),
    });
  }
});

// Complaint detail page — full info, hotspot badge, bookmark button, resolved badge
router.get("/:id", async (req, res) => {
  try {
    const complaint = await getComplaintById(req.params.id);
    const hotspot = await getHotspotByAddress(complaint.incidentAddress);

    const bookmarked = req.session.userId
      ? await isBookmarked(req.session.userId, req.params.id)
      : false;

    const isOwner =
      !!req.session.userId &&
      complaint.userId?.toString() === req.session.userId;
    const canResolve =
      complaint.source === "user" &&
      complaint.status !== "resolved" &&
      (isOwner || req.session.role === "admin");

    return res.render("complaints/detail", {
      title: "Complaint Details",
      complaint,
      complaintId: req.params.id,
      isHotspot: hotspot?.confirmedHotspot || false,
      topComplaintType: hotspot?.topComplaintType || null,
      isResolved: complaint.status === "resolved",
      is311: complaint.source === "311",
      loggedIn: !!req.session.userId,
      isBookmarked: bookmarked,
      canResolve,
    });
  } catch (e) {
    return res.status(typeof e === "string" ? 404 : 500).render("error", {
      message: publicError(e, "Complaint details are temporarily unavailable"),
    });
  }
});

// Mark a complaint resolved — owner or admin only, re-runs hotspot upsert
router.put("/:id/resolve", async (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: "Login required" });
  try {
    const updated = await resolveComplaint(
      req.params.id,
      req.session.userId,
      req.session.role,
    );
    return res.status(200).json(updated);
  } catch (e) {
    return res.status(typeof e === "string" ? 400 : 500).json({
      error: publicError(e),
    });
  }
});

export default router;
