import Firestore from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import admin from "firebase-admin";
import fetch from "node-fetch";


// Declare variables.
const username = "";
const password = "";
const saveUserInfo = true;
const defaultPicUrl = null;
const bucketPath = "avatars";
const bucketId = "gs://put-gang.appspot.com";
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"

// Initialize Firebase products.
const db = new Firestore();
const storage = new Storage();
const instagramDb = db.collection(bucketPath);
const bucket = storage.bucket(bucketId);

// Returns avatar url from Firebase Storage. Gets and stores it if not present.
export async function storeProfilePic (user) {
  // Return avatar if it already exists.
  const file = bucket.file(`${bucketPath}/${user}.png`);
  let exists = await file.exists();
  if (exists[0]) {
    return file.publicUrl();
  }

  // Get url.
  let url = await getProfilePicUrl(user);
  if (url) {
    // Load image.
    try {
      let response = await fetch(url, {
        method: "GET",
        headers: {
          referer: "https://www.instagram.com/"
        }
      });
      let data = await response.arrayBuffer();
      const buffer = Buffer.from(data);

      // store img file in bucket
      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          origin: ["*"],
          instagram_pic_url: url
        }
      });
      await file.makePublic();
      return file.publicUrl();
    } catch (e) {
      console.log(e);
      return null;
    }
  } else {
    return null;
  }
}

// Checks to see if photo is already in Firebase Storage first. If not, retrieve
// url from Instagram, save photo to Storage and return that url.
// This prevents excessive calls and avoids Instagram blocking our requests.
export async function getAvatar (username) {
  let url = null;
  let from_cache = false;

  const cache = await getAvatarFromCache(username);
  if (cache.exists) {
    url = cache.url;
    from_cache = true;
  } else {
    const picUrl = await getAvatarUrl(username);
    const imgBuffer = await getAvatarImage(picUrl);
    url = await uploadAvatar(imgBuffer, username);
  }
  return { url, from_cache };
}



/*
 *   Helper functions for the above function.
 *   As such, these do not get exported.
 */

// Returns the users instagram profile photo from the Public api.
async function getAvatarUrl (username) {
  const fetchConfig = {
    method: "GET",
    headers: {
      host: "www.instagram.com"
    }
  };
  const response = await fetch(`https://www.instagram.com/${username}/?__a=1`, fetchConfig);
  const jsonResponse = await response.json();
  const photoUrl = jsonResponse.graphql?.user?.profile_pic_url_hd;
  return photoUrl;
}

// Return the profile photo at the provided url.
async function getAvatarImage (url) {
  let response = await fetch(url);
  let data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  return buffer;
}

// Uploads the profile photo to a Firebase storage bucket.
async function uploadAvatar (imageBuffer, username) {
  const storage = admin.storage().bucket(bucketId);
  const file = storage.file(`${bucketPath}/${username}.png`);
  await file.save(imageBuffer, {
    metadata: {
      contentType: "image/png",
      origin: ["*"],
    }
  });
  await file.makePublic();
  return file.publicUrl();
}

// Checks to see if the photo is already in Firebase storage.
async function getAvatarFromCache (username) {
  const storage = admin.storage().bucket(bucketId);
  let file = storage.file(`${bucketPath}/${username}.png`);
  let exists = await file.exists();
  if (exists[0]) {
    return { exists: true, url: file.publicUrl() };
  } else {
    return { exists: false, url: null };
  }
}

// Store Instagram cookies in Firestore after login for use later.
async function setSessionCache (cookie) {
  await instagramDb.doc("__session").set({
    cookie: cookie,
    created: Date.now()
  });
}

// Return session cache from Firestore if it exists.
async function getSessionCache () {
  let doc = await instagramDb.doc("__session").get();
  let data = doc.data();
  let cookie = data ? data.cookie : null;
  return cookie;
}

// Need to get CSRF token before login.
async function csrfToken () {
  let url = "https://www.instagram.com/accounts/login/";
  let options = {
    "method": "GET",
    "headers": {
      "Host": "www.instagram.com",
      "user-agent": userAgent
    }
  };
  let response = await fetch(url, options);
  let page = await response.text();
  let csrf = page.match(/csrf_token\":\"(.*?)\"/);
  return csrf !== null ? csrf[1] : null;
}

// Do login and return resulting cookie string.
async function login (username, password) {
  let url = "https://www.instagram.com/accounts/login/ajax/";
  let csrf = await csrfToken();
  let options = {
    method: "POST",
    headers: {
      "user-agent": userAgent,
      "x-csrftoken": csrf,
      "x-requested-with": "XMLHttpRequest",
      "referer": "https://www.instagram.com/accounts/login/"
    },
    body: new URLSearchParams({
      enc_password: `#PWD_INSTAGRAM_BROWSER:0:${Date.now()}:${password}`,
      username: username,
      queryParams: "{}",
      optIntoOneTap: "false"
    })
  }
  let response = await fetch(url, options);
  let setCookie = response.headers.raw()["set-cookie"];
  let cookies = "";

  for (let i = 0; i < setCookie.length; i++) {
    let match = setCookie[i].match(/^[^;]+;/);
    if (match) {
      cookies = `${cookies} ${match[0]}`;
    }
  }
  return cookies;
}

// Get profile_pic_hd url.
async function getProfilePicUrl (user) {
  // Check cache first.
  let doc = await instagramDb.doc(user).get();
  let data = doc.data();
  if (data && data.profile_pic_url_hd) {
    return data.profile_pic_url_hd;
  }
  // Check if session exists or not.
  let sessionCookie = await getSessionCache();
  if (!sessionCookie) {
    sessionCookie = await login(username, password);
    await setSessionCache(sessionCookie);
  }
  // profile_pic_url_hd can be parsed from user html page itself or from Public api.
  // Public api needs more testing.
  // Try with Public api first, fallback to page parsing after.
  let profile_pic_hd = defaultPicUrl;
  try {
    let response = await fetch(`https://instagram.com/${user}/?__a=1`, {
      headers: {
        cookie: sessionCookie
      }
    })
    let page = await response.json();
    if (saveUserInfo) {
      try {
        let userInfo = page.graphql?.user;
        await instagramDb.doc(user).set({
          id: userInfo.id,
          username: userInfo.username,
          profile_pic_url_hd: userInfo.profile_pic_url_hd,
          profile_pic_url: userInfo.profile_pic_url,
          full_name: userInfo.full_name,
          fbid: userInfo.fbid,
          external_url: userInfo.external_url,
          biography: userInfo.biography
        })
      } catch (e) {
        console.log("Can't collect user_info from api", e);
      }
    }

    profile_pic_hd = page.graphql?.user?.profile_pic_url_hd;
  } catch (e) {
    console.log(e);
    let response = await fetch(`https://instagram.com/${user}`, {
      headers: {
        cookie: sessionCookie
      }
    })
    let page = await response.text();
    let match = page.match(/profile_pic_url_hd":"(.+?)"/);

    profile_pic_hd = match !== null ? JSON.parse(`["${match[1]}"]`)[0] : null;
    if (saveUserInfo) {
      try {
        await instagramDb.doc(user).set({
          username: user,
          profile_pic_hd: profile_pic_hd
        });
      } catch (e) {
        console.log("Can't collect user_info from parsing", e);
      }
    }
  }
  return profile_pic_hd;
}
