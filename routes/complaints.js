import { Router } from "express";
import {
  submitComplaint,
  getAllComplaints,
  aggregateComplaintType,
  sortDate,
  shuffleComplaints,
  resolveComplaint,
  getComplaintById,
} from "../data/complaints.js";
import { getAllHotspots, getHotspotByAddress } from "../data/hotspots.js";
import { getCached311, getComplaintTrends } from "../data/nyc311.js";
import { getAddressHistory } from "../data/addressHistory.js";
import { isBookmarked } from "../data/users.js";
import { geocodePin } from "../helper.js";

const router = Router();

const TYPES = [
  "Loud Music/Party",
  "Construction",
  "Barking Dog",
  "Vehicle Idling",
  "Loud Talking",
  "Other",
];

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

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
      error: e,
      types: TYPES,
      boroughs: BOROUGHS,
    });
  }
});

router.route("/browse").get(async (req, res) => {
  try {
    const { borough, complaintType, from, to, search, sort } = req.query;

    const filters = { borough, complaintType, from, to, search };

    const complaintList = await getAllComplaints(filters);
    const nyc311List = await getCached311(filters);

    let combinedList = complaintList.concat(nyc311List);

    await shuffleComplaints(combinedList);

    if (sort) {
      if (sort === "Newest") {
        await sortDate(combinedList, 1);
      } else if (sort === "Oldest") {
        await sortDate(combinedList, 0);
      }
    }

    const page = parseInt(req.query.page, 10) || 1;
    const totPages = Math.ceil(combinedList.length / 10);
    const startIndex = (page - 1) * 10;
    const paginatedList = combinedList.slice(startIndex, startIndex + 10);

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
      isNewest: sort === "Newest",
      isOldest: sort === "Oldest",
      from,
      to,
      search,
      queryString,
    });
  } catch (e) {
    res.status(500).send(e);
  }
});

router.route("/hotspots").get(async (req, res) => {
  try {
    const { borough } = req.query;
    const filters = { borough };

    const hotspotList = await getAllHotspots(filters);

    const page = parseInt(req.query.page, 10) || 1;
    const totPages = Math.ceil(hotspotList.length / 10);
    const startIndex = (page - 1) * 10;
    const paginatedList = hotspotList.slice(startIndex, startIndex + 10);

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
    return res.status(500).send(e);
  }
});

router.get("/address", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.render("complaints/address", {
      title: "Address History",
      results: null,
    });
  }
  try {
    const data = await getAddressHistory(q);
    return res.render("complaints/address", {
      title: "Address History",
      ...data,
    });
  } catch (e) {
    return res.render("complaints/address", {
      title: "Address History",
      error: e,
      results: null,
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
    return res.status(500).render("error", { message: e });
  }
});

router.get("/common", async (req, res) => {
  try {
    const data_aggr = await aggregateComplaintType();
    const page = parseInt(req.query.page, 10) || 1;
    const totPages = Math.ceil(data_aggr.length / 10);
    const startIndex = (page - 1) * 10;
    const paginatedList = data_aggr.slice(startIndex, startIndex + 10);

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
    return res.status(500).render("error", { message: e });
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
    return res.status(404).render("error", { message: e });
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
    return res.status(400).json({ error: e.toString() });
  }
});

export default router;