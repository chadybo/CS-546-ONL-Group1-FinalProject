import { Router } from "express";
import { submitComplaint, getAllComplaints } from "../data/complaints.js";
import { getAllHotspots } from "../data/hotspots.js";
import { getCached311, getComplaintTrends } from "../data/nyc311.js";
import { getAddressHistory } from '../data/addressHistory.js';


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
    const { borough, complaintType, from, to, search } = req.query;

    const filters = { borough, complaintType, from, to, search };

    const complaintList = await getAllComplaints(filters);
    const nyc311List = await getCached311(filters);

    let combinedList = complaintList.concat(nyc311List);

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

    return res.render("complaints/hotspots", {
      hotspots: paginatedList,
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
      queryString,
    });
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get('/address', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.render('complaints/address', {
      title: 'Address History',
      results: null
    });
  }
  try {
    const data = await getAddressHistory(q);
    return res.render('complaints/address', {
      title: 'Address History',
      ...data
    });
  } catch (e) {
    return res.render('complaints/address', {
      title: 'Address History',
      error: e,
      results: null
    });
  }
});

// Complaint trends over time
router.get('/trends', async (req, res) => {
  const { borough } = req.query;
  try {
    const trends = await getComplaintTrends(borough);
    return res.render('complaints/trends', {
      title: 'Complaint Trends',
      trends,
      borough,
      boroughs: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
      isManhattan: borough === 'Manhattan',
      isBrooklyn: borough === 'Brooklyn',
      isQueens: borough === 'Queens',
      isBronx: borough === 'Bronx',
      isStatenIsland: borough === 'Staten Island'
    });
  } catch (e) {
    return res.status(500).render('error', { message: e });
  }
});

export default router;
