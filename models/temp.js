const { Sequelize, DataTypes, Model } = require('sequelize');

module.exports=(sequelize)=>
    sequelize.define("temp",
        {
            id:{
                type:DataTypes.INTEGER,
                allowNull:false,
                autoIncrement:true,
                primaryKey:true
            },
            anime:{
                type:DataTypes.INTEGER,
                allowNull:false
            },
            name:{
                type:DataTypes.STRING,
                allowNull:false
            },
            link:{
                type:DataTypes.STRING,
                allowNull:false
            },
            image:{
                type:DataTypes.STRING,
                allowNull:true
            },
            in_broadcast:{
                type:DataTypes.BOOLEAN
            },
            finish_view:{
                type:DataTypes.BOOLEAN
            }

        },{
            tableName:"temp",
            timestamps:false
        }

    )