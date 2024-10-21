const { Sequelize, DataTypes, Model } = require('sequelize');

module.exports=(sequelize)=>
    sequelize.define("anime",
        {
            id:{
                type:DataTypes.INTEGER,
                allowNull:false,
                autoIncrement:true,
                primaryKey:true
            },
            name:{
                type:DataTypes.STRING,
                allowNull:false
            },
            in_broadcast:{
                type:DataTypes.BOOLEAN
            },
            finish_view:{
                type:DataTypes.BOOLEAN
            }

        },{
            tableName:"anime",
            timestamps:false
        }

    )