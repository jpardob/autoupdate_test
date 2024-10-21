const { Sequelize, DataTypes, Model } = require('sequelize');

module.exports=(sequelize)=>
    sequelize.define("episode",
        {
            id:{
                type:DataTypes.INTEGER,
                allowNull:false,
                autoIncrement:true,
                primaryKey:true
            },
            temp:{
                type:DataTypes.INTEGER,
                allowNull:false
            },
            number:{
                type:DataTypes.INTEGER,
                allowNull:false
            },
            link:{
                type:DataTypes.STRING,
                allowNull:false
            },
            view:{
                type:DataTypes.BOOLEAN
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },

        },{
            tableName:"episode",
            timestamps:false
        }

    )