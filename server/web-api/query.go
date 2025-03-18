package webapi

import (
	"athenabase/internal"
	"athenabase/internal/model"
	"athenabase/internal/web"
	"database/sql"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

func RegisterQueryRouter(group *gin.RouterGroup) {
	dataBaseGroup := group.Group("/query")

	dataBaseGroup.Use(web.WebAuth())

	dataBaseGroup.POST("", func(ginCtx *gin.Context) {
		var body struct {
			DataBase int    `json:"database"`
			Stmt     string `json:"stmt"`
		}
		if err := ginCtx.ShouldBindJSON(&body); err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}
		ctx := ginCtx.Request.Context()

		database := new(model.DataBase)
		err := model.MasterDB().NewSelect().Model(database).Where("id = ?", body.DataBase).Scan(ctx)
		if err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}

		db, err := internal.Core.GetDataBase(database.DriverName(), database.DSN())
		if err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}

		stmt := strings.ReplaceAll(body.Stmt, ";", "")
		rows, err := db.QueryContext(ctx, fmt.Sprintf("select * from (%s) result limit 200", stmt))
		if err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}
		defer rows.Close()

		cols, err := rows.Columns()
		if err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}

		columnTypes, err := rows.ColumnTypes()
		if err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}
		type Column struct {
			Name string `json:"name"`
			Type string `json:"type"`
		}
		columns := make([]Column, len(cols))
		for i, col := range columnTypes {
			columns[i] = Column{Name: col.Name(), Type: col.DatabaseTypeName()}
		}

		var results [][]string
		values := make([]sql.RawBytes, len(cols))
		scanArgs := make([]interface{}, len(values))
		for i := range values {
			scanArgs[i] = &values[i]
		}
		for rows.Next() {
			err = rows.Scan(scanArgs...)
			if err != nil {
				web.GetWebCtx(ginCtx).ApiResp.Set(err)
				return
			}

			var valueTexts []string
			for _, value := range values {
				if value == nil {
					valueTexts = append(valueTexts, "NULL")
				} else {
					valueTexts = append(valueTexts, string(value))
				}
			}
			results = append(results, valueTexts)
		}
		if err = rows.Err(); err != nil {
			web.GetWebCtx(ginCtx).ApiResp.Set(err)
			return
		}

		web.GetWebCtx(ginCtx).ApiResp.Set(gin.H{
			"columns": columns,
			"results": results,
		})
	})

}
