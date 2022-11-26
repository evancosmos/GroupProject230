import express from "express"
import mysql from "mysql2"
import cors from "cors"

const app = express()

const databaseName = "test3"

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: databaseName,
})

app.use(express.json())
app.use(cors())

//DDL Queries, i.e creating our database table structure
//TODO: Fix SQL errors when creating tables (maybe change order to avoid forgein key problems?)
app.post("/createTable", async(req, res) => {
    const DMLArray = []

    const mkChannelTbl = "Create table Channel(channel_id CHAR(20) PRIMARY KEY,account_id CHAR(20 )References Account(account_id)banner_picture MEDIUMBLOB,channel_name VARCHAR(50),subscribers_count INT);"
    const mkVidTbl = "Create table Video(video_id CHAR(20) Primary key,Length TIME,title VARCHAR(50),description VARCHAR(100),views INT,likes INT,Is_short_style BOOLEAN,channel_id CHAR(20),FOREIGN KEY (channel_id) References Channel(channel_id));"
    const mkVidCatTbl = "Create table Video-Category(Category VARCHAR(20),video_id CHAR(20) References Video(video_id),PRIMARY KEY (Category, video_id));"
    const mkVidPlayTbl = "Create table Video-Playlist(playlist_id CHAR(20) References Playlist(playlist_id),video_id CHAR(20) References Video(video_id),PRIMARY KEY (playlist_id, video_id));"
    const mkPlayTbl = "Create table Playlist(playlist_id CHAR(20) PRIMARY KEY,playlist_name VARCHAR(50),channel_id CHAR(20),FOREIGN KEY (channel_id) References Channel(channel_id));"
    const mkAccTbl = "Create table Account(account_id CHAR(20) PRIMARY KEY,profile_picture MEDIUMBLOB,username VARCHAR(15),created_on DATE);"
    const mkCommentTbl = "Create table Comment(comment_id CHAR(20) PRIMARY KEY,Likes INT,Dislikes INT,word VARCHAR(100),channel_id CHAR(20) References Channel(channel_id),video_id CHAR(20) References Video(video_id),);"
    const mkCommentOnTbl = "Create table Comment_on(commenter_id CHAR(20) References Comment(comment_id),commentee_id CHAR(20),PRIMARY KEY(commenter_id,commentee_id));"
    const mkSubTbl = "Create table Subscribe_to(subscriber_id CHAR(20) References Channel(channel_id),subscribee_id CHAR(20) References Channel(channel_id),PRIMARY KEY(subscriber_id,subscribee_id));"

    DMLArray.push(mkVidTbl, mkVidCatTbl, mkVidPlayTbl, mkPlayTbl, mkAccTbl, mkCommentTbl, mkCommentOnTbl, mkChannelTbl, mkSubTbl);

    DMLArray.forEach((curQuery) => {
        db.query(curQuery, (err, result) => {
            if(err) throw err;
            console.log("Created Table")
        })
    })

    return res.json();
})

app.get("/", async (req, res) => {
    const tables = {}
    const columns = `SELECT * FROM information_schema.columns WHERE table_schema = '${databaseName}'`
    db.query(columns, (err, results) => {
        if (err) return res.json(err)

        for (const result of results) {
            if (tables[result.TABLE_NAME] === undefined) {
                tables[result.TABLE_NAME] = [
                    `${result.COLUMN_NAME}.${result.COLUMN_TYPE}.${
                        result.IS_NULLABLE === "YES" ? "OPTIONAL" : "REQUIRED"
                    }`,
                ]
            } else {
                tables[result.TABLE_NAME] = [
                    ...tables[result.TABLE_NAME],
                    `${result.COLUMN_NAME}.${result.COLUMN_TYPE}.${
                        result.IS_NULLABLE === "YES" ? "OPTIONAL" : "REQUIRED"
                    }`,
                ]
            }
        }
        // console.log(results)

        return res.json(tables)
    })
})

function formatSearch(data) {
    const tables = new Set()
    for (const d of data) {
        const textArr = d.split(".")
        if (!tables.has(textArr[0])) {
            tables.add(textArr[0])
        }
    }

    let s = "SELECT "
    for (let i = 0; i < data.length; i++) {
        if (i === data.length - 1) {
            s += data[i]
        } else {
            s += data[i] + ", "
        }
    }
    s += " FROM "

    const tablesArr = Array.from(tables)
    for (let i = 0; i < tablesArr.length; i++) {
        if (i === tablesArr.length - 1) {
            s += tablesArr[i]
        } else {
            s += tablesArr[i] + ", "
        }
    }

    s += ";"

    return s
}

function formatTableName(data) {
    const s = new Set()
    for (const tableName of data) {
        s.add(tableName.split(".")[0])
    }
    if (s.size >= 2) {
        return "__MULTIPLE_TABLES"
    } else return Array.from(s)[0]
}
app.post("/api/search", async (req, res) => {
    const searchQuery = formatSearch(req.body.checked)
    const tableName = formatTableName(req.body.checked)
    db.query(searchQuery, (err, results) => {
        if (err) return res.json(err)
        // console.log(results)
        return res.json({ results, tableName })
    })
})

function formatInsert(data) {
    let tableName = ""
    let colNames = []
    let values = []
    for (const [key, val] of Object.entries(data)) {
        if (tableName === "") tableName = key.split(".")[0]
        if (val !== "") {
            colNames.push(key.split(".")[1])
            values.push(val)
        }
    }

    let s = `INSERT INTO ${tableName} (`
    for (let i = 0; i < colNames.length; i++) {
        if (i === colNames.length - 1) {
            s += colNames[i] + ") "
        } else {
            s += colNames[i] + ", "
        }
    }

    s += "VALUES ("
    for (let i = 0; i < values.length; i++) {
        if (i === values.length - 1) {
            s += `'${values[i]}'` + ")"
        } else {
            s += `'${values[i]}'` + ","
        }
    }

    s += ";"

    return s
}

app.post("/api/insert", async (req, res) => {
    const insertQuery = formatInsert(req.body)
    db.query(insertQuery, (err, results) => {
        if (err) return res.json(err.sqlMessage)
        return res.json("SUCCESS")
    })
})

function formatDelete(data) {
    let s = "DELETE FROM "
    s += data?.tableName
    delete data?.tableName
    s += " WHERE "
    for (const [key, val] of Object.entries(data)) {
        s += key + "=" + `'${val}'`
        s += " AND "
    }
    s = s.slice(0, -5)
    s += ";"
    return s
}

app.post("/api/delete", async (req, res) => {
    const deleteQuery = formatDelete(req.body)
    db.query(deleteQuery, (err, results) => {
        if (err) return res.json(err.sqlMessage)
        return res.json("SUCCESS")
    })
})

function formatUpdate(data) {
    let s = "UPDATE "
    let tableName = ""
    const inputs = data.inputs
    const oldInputs = data.oldInputs
    for (const [key, val] of Object.entries(inputs)) {
        if (tableName === "") tableName += key.split(".")[0]
        if (val === null) {
            delete inputs[key]
        }
    }
    for (const [key, val] of Object.entries(oldInputs)) {
        if (tableName === "") tableName += key.split(".")[0]
        if (val === null) {
            delete oldInputs[key]
        }
    }

    s += tableName
    s += " SET "

    for (const [key, val] of Object.entries(inputs)) {
        s += key + "=" + `'${val}'`
        s += ", "
    }
    s = s.slice(0, -2)
    s += " WHERE "
    for (const [key, val] of Object.entries(oldInputs)) {
        s += key + "=" + `'${val}'`
        s += " AND "
    }
    s = s.slice(0, -5)
    s += ";"
    return s
}

app.post("/api/update", async (req, res) => {
    const updateQuery = formatUpdate(req.body)
    db.query(updateQuery, (err, results) => {
        if (err) return res.json(err.sqlMessage)
        return res.json("SUCCESS")
    })
})

app.listen(8888, () => {
    db.ping((err) => {
        if (err) {
            console.log("Connection Error!")
            console.log("Have you started Apache and MySQL on XAMPP?")
            console.log(`Have you created a database in phpMyAdmin with the name: ${databaseName}?`)
        } else {
            console.log("Connection Success!")
        }
    })
})
